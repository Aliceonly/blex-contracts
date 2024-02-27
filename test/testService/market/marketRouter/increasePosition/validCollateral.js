const {
  increasePosition,
} = require("../../../../../scripts/market/marketRouter");

const { setPrice, getPrice } = require("../../../../../scripts/mock/oracle");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { expect } = require("chai");

const {
  getCurrentPosition,
  totalFees,
  calcPNL,
  calcOpenFee,
  calcMarketAmount,
  calcCollateral,
  numberToBigNumber,
  getFundFee,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  buildIncreasePositionParam,
  buildFees,
} = require("../../../utils/buildParams");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  validPnl,
  validCollateral,
  validTransfer,
  validSize,
  vaildUpdatePositionEvent,
  validBalanceChange,
  validAvgPrice,
} = require("../../../utils/vaildData");
const { execPrePare } = require("../../../utils/buildLogic");
const { vaildPosition } = require("../../../utils/vaildPosition");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { BigNumber } = require("ethers");

describe("increasePosition", async () => {
  let allContracts;
  let owner, second, third;
  beforeEach(async () => {
    [owner, second, third] = await ethers.getSigners();
    allContracts = await readServiceAllMarket();
    await execCancelOrderAndLiqPosition({
      users: [owner, second, third],
      market: allContracts.market.address,
      orderBookLong: allContracts.orderBookLong,
      orderBookShort: allContracts.orderBookShort,
      indexToken: allContracts.indexToken,
    });
  });
  it("Increase open interest and check collateral at different market prices, check test cases for effective profit and loss calculations", async () => {
    logger.info(
      "---Increase open interest and check collateral at different market prices, check test cases for effective profit and loss calculations---"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });

    await validSize({
      user: owner.address,
      price: 0,
      isLong: true,
      size: 0,
    });

    //Build position opening parameters
    let params = buildIncreasePositionParam({
      market: allContracts.market.address,
      price: 40000,
      pay: 10,
      size: 90,
    });
    //Get the  user current position
    let position = await getCurrentPosition({
      user: owner.address,
      price: 40000,
      isLong: true,
    });

    //Get the sum of funding rates at the current time
    let cumRates = await getCumulativeFundingRates(
      allContracts.market.address,
      true
    );

    //Local calculation of funding rate
    let fundingFee = getFundingFee({
      size: position.size,
      entryFundingRate: position.entryFundingRate,
      cumRates: cumRates,
    });

    //Get opening fee
    let openFee = calcOpenFee({
      sizeDelta: params._sizeDelta,
    });
    //Construct the various fees of this transaction
    let fees = buildFees({
      openFee: openFee,
      fundFee: fundingFee,
    });
    //Add up various expenses
    let totalFee = totalFees(fees);
    let collD = params.collateralDelta.sub(totalFee);
    //
    let oracelPrice = await getPrice(allContracts.indexToken, true);
    params._oraclePrice = oracelPrice;

    vaildPosition({
      params: params,
      position: position,
      fees: totalFee,
    });

    let eventArgs = [
      owner.address, //account
      params.collateralDelta, //collateralDelta
      collD, //collD
      params._sizeDelta, //size
      true, //isLong
      oracelPrice, //oraclePrice
      0, //pnl
      fees, //fees []int
      allContracts.market.address, //market
      allContracts.collateralToken, //collateralToken
      allContracts.indexToken, // indextoken
      0, //category
      0, //fromOrder
    ];
    let beforeMarketAmount = await balanceOf(allContracts.market.address);
    //Get market borrow funds before trading
    let beforeMarketFundsUsed = await getMarketFundsUsed(
      allContracts.market.address
    );

    let beforeAmount = await balanceOf(owner.address);
    //Open Position
    let lastTx = await increasePosition(params);
    //Obtain market borrowing funds after the transaction is completed
    let afterMarketFundsUsed = await getMarketFundsUsed(
      allContracts.market.address
    );
    let afterMarketAmount = await balanceOf(allContracts.market.address);
    //
    let afterAmount = await balanceOf(owner.address);

    let marketAmount = calcMarketAmount({
      amount: params.collateralDelta,
      fee: totalFee,
    });
    //check  market balance changes
    validBalanceChange(
      marketAmount,
      afterMarketAmount.sub(beforeMarketAmount),
      "check  market balance changes"
    );
    //check
    validBalanceChange(
      params._sizeDelta,
      afterMarketFundsUsed.sub(beforeMarketFundsUsed),
      "check borrow sizechange"
    );
    validBalanceChange(
      params.collateralDelta,
      beforeAmount.sub(afterAmount),
      "test case"
    );

    //After executing the transaction, check the user's position
    await validSize({
      user: owner.address,
      price: 40000,
      size: 90,
      isLong: true,
    });
    await validCollateral({
      user: owner.address,
      price: 40000,
      isLong: params._isLong,
      coll: calcCollateral({
        pay: params.collateralDelta,
        fees: totalFee,
      }),
    });

    await vaildUpdatePositionEvent({
      contract: allContracts.marketRouter,
      tx: lastTx,
      args: eventArgs,
    });

    //check feeRouter
    await validTransfer({
      tokenContract: allContracts.USDC,
      blockNumber: lastTx.blockNumber,
      from: allContracts.market.address,
      to: allContracts.allFee.feeVault.address,
      amount: totalFee,
      label: "checkfeeRouterchange",
      expandDecimals: false,
    });

    //check  the user balance transferred to the market amount
    await validTransfer({
      tokenContract: allContracts.USDC,
      blockNumber: lastTx.blockNumber,
      from: owner.address,
      to: allContracts.market.address,
      amount: 10,
      label: "check  the user balance transferred to the market amount",
    });

    await setPrice(allContracts.indexToken, 50000);
    //Get the  user current position
    position = await getCurrentPosition({
      user: owner.address,
      price: 0,
      isLong: true,
    });

    let result = calcPNL({
      position: position,
      price: 50000,
    });

    let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);
    //checkpnl
    await validPnl({
      user: owner.address,
      price: 50000,
      isLong: true,
      pnl: pnl,
    });

    //Check average price
    await validAvgPrice({
      user: owner.address,
      price: 50000,
      isLong: true,
      price0: 40000,
    });
  });

  it("Test case for increasing open interest and checking collateral at different market prices", async () => {
    logger.info(
      "Test case for increasing open interest and checking collateral at different market prices"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });

    //Build position opening parameters
    let params = buildIncreasePositionParam({
      market: allContracts.market.address,
      price: 40000,
      pay: 10,
      size: 90,
    });

    //Open Position
    {
      //check  the user's position before executing the trade
      await validSize({
        user: owner.address,
        price: 0,
        isLong: true,
        size: 0,
      });

      //Get the market balance before the transaction is initiated
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 40000,
        isLong: true,
      });

      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        true
      );

      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });

      //Get opening fee
      let openFee = calcOpenFee({
        sizeDelta: params._sizeDelta,
      });
      //Construct the various fees of this transaction
      let fees = buildFees({
        openFee: openFee,
        fundFee: fundingFee,
      });

      let totalFee = totalFees(fees);

      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      let beforeAmount = await balanceOf(owner.address);

      let lastTx = await increasePosition(params);
      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      let afterAmount = await balanceOf(owner.address);
      //Get the market balance after the transaction is completed
      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM valuechange"
      );

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //Calculate the funds that the market should receive
      let marketAmount = calcMarketAmount({
        amount: params.collateralDelta,
        fee: totalFee,
      });
      //check market bal change
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check market bal change"
      );
      //check
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "check borrow size"
      );

      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check add coll amount"
      );

      //check  user's position after trade execution
      await validSize({
        user: owner.address,
        price: 40000,
        size: 90,
      });
      let oracelPrice = await getPrice(allContracts.indexToken, true);

      let collD = params.collateralDelta.sub(totalFee);
      //
      let eventArgs = [
        owner.address, //account
        params.collateralDelta, //collateralDelta
        collD, //collD
        params._sizeDelta, //size
        true, //isLong
        oracelPrice, //oraclePrice
        0, //pnl
        fees, //fees []int
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        0, //category
        0, //fromOrder
      ];

      //check collateral
      await validCollateral({
        user: owner.address,
        price: 40000,
        isLong: params._isLong,
        coll: calcCollateral({
          pay: params.collateralDelta,
          fees: totalFee,
        }),
      });
      //Check average price
      await validAvgPrice({
        user: owner.address,
        price: 0,
        isLong: true,
        price0: 40000,
      });

      //check feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "check  the amount transferred from market to feeVault",
        expandDecimals: false,
      });

      //check  the user balance transferred to the market amount
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 10,
        label: "check  the user balance transferred to the market amount",
      });

      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });
    }

    {
      await userMintAndApprove(owner, 10, allContracts.marketRouter);
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      await validSize({
        user: owner.address,
        price: 40000,
        size: 90,
      });

      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 40000,
        isLong: true,
      });

      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        true
      );

      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });

      //Get opening fee
      let openFee = calcOpenFee({
        sizeDelta: params._sizeDelta,
      });
      //Construct the various fees of this transaction
      let fees = buildFees({
        openFee: openFee,
        fundFee: fundingFee,
      });
      let totalFee = totalFees(fees);
      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      //Used to check  the position
      params._oraclePrice = oracelPrice;
      // check  the position
      vaildPosition({
        params: params,
        position: position,
        fees: fees,
      });

      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      //
      let beforeAmount = await balanceOf(owner.address);
      //increase position
      let lastTx = await increasePosition(params);
      //
      let afterAmount = await balanceOf(owner.address);
      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      //Get the market balance after the transaction is completed
      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM valuechange"
      );
      //Calculate the funds that the market should receive
      let marketAmount = calcMarketAmount({
        amount: params.collateralDelta,
        fee: totalFee,
      });

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //check market bal change
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check market bal change"
      );
      //check  user balance changes
      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user balance changes"
      );

      //check
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "check borrow size"
      );

      oracelPrice = await getPrice(allContracts.indexToken, true);

      let collD = params.collateralDelta.sub(totalFee);

      let eventArgs = [
        owner.address, //account
        params.collateralDelta, //collateralDelta
        collD, //collD
        params._sizeDelta, //size
        true, //isLong
        oracelPrice, //oraclePrice
        0, //pnl
        fees, //fees []int
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        0, //category
        0, //fromOrder
      ];

      //check size
      await validSize({
        user: owner.address,
        price: 40000,
        size: 180,
      });
      //Check average price
      await validAvgPrice({
        user: owner.address,
        price: 0,
        isLong: true,
        price0: 40000,
      });

      //check collateral
      await validCollateral({
        user: owner.address,
        price: 40000,
        isLong: params._isLong,
        coll: calcCollateral({
          pay: position.collateral.add(params.collateralDelta),
          fees: totalFee,
        }),
      });

      //check feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "check  the amount transferred from market to feeVault",
        expandDecimals: false,
      });

      //check  the user balance transferred to the market amount
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 10,
        label: "check  the user balance transferred to the market amount",
      });

      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });
    }
  });
});
