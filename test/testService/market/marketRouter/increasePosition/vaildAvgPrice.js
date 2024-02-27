const {
  increasePosition,
} = require("../../../../../scripts/market/marketRouter");

const { setPrice, getPrice } = require("../../../../../scripts/mock/oracle");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  execCancelOrderAndLiqPosition,
  readServiceAllMarket,
} = require("../../../deploy/deployAllContract");

const {
  getCurrentPosition,
  totalFees,
  calcPNL,
  calcOpenFee,
  calcMarketAmount,
  calcCollateral,
  calAveragePrice,
  getSize,
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

const { validateIncreasePosition } = require("../../../utils/globalVaild");

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

  it("Test cases for increasing positions and gaining profit at different market prices, and checking the average price", async () => {
    logger.info(
      "---Test cases for increasing positions and gaining profit at different market prices, and checking the average price---"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });

    {
      //check  the user's position before executing the trade
      await validSize({
        user: owner.address,
        price: 0,
        isLong: true,
        size: 0,
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

      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 10,
        size: 90,
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
      //Sum up the various expenses
      let totalFee = totalFees(fees);
      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      //Used to check  the position
      params._oraclePrice = oracelPrice;
      await validateIncreasePosition({
        _inputs: params,
        user: owner.address,
        collateralToken: allContracts.collateralToken,
      });
      // check  the position
      vaildPosition({
        params: params,
        position: position,
        fees: fees,
      });
      //Get the market balance before the transaction is initiated
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      //Get AUM for subsequent data verification
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Get the user's balance before the transaction
      let beforeAmount = await balanceOf(owner.address);
      //Open Position
      let lastTx = await increasePosition(params);
      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      let afterAmount = await balanceOf(owner.address);

      //Calculate the collD required for the emit event
      let collD = params.collateralDelta.sub(totalFee);

      //Build event parameter list
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
        0, //category Open Position is 0, increase collateral  is 2
        0, //fromOrder
      ];

      //Get the market balance after the transaction is completed
      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );
      //Only Open Position AUM will not change anything
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //check  user's position after trade execution
      await validSize({
        user: owner.address,
        price: 40000,
        size: 90,
      });

      //Calculate the funds that the market should receive
      let marketAmount = calcMarketAmount({
        amount: params.collateralDelta,
        fee: totalFee,
      });
      //Check borrow Size
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check market borrow size"
      );
      //check  market balance changes
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
      );
      //check  user balance changes
      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user balance changes"
      );

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
        label: "check  the amount transferred by the user to the market",
      });
      //get position
      position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });
      //Check PNL, because it is the first time to add a position, so PNL should be 0
      //Calculate PNL locally,,
      let result = calcPNL({
        position,
        price: 40000,
      });
      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);
      await validPnl({
        user: owner.address,
        price: 40000,
        isLong: true,
        pnl: pnl,
      });

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
        price0: calAveragePrice({
          position: position,
          sizeDelta: params._sizeDelta,
          marketPrice: oracelPrice,
          pnl: 0,
          hasProfit: true,
        }),
      });
      //check  event and corresponding parameters
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });
    }
    //Set the oracle price
    await setPrice(allContracts.indexToken, 50000);
    {
      await userMintAndApprove(owner, 10, allContracts.marketRouter);

      let beforeMarketAmount = await balanceOf(allContracts.market.address);

      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      let beforeAmount = await balanceOf(owner.address);

      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 50000,
        pay: 10,
        size: 90,
      });
      // check user size
      await validSize({
        user: owner.address,
        price: 0,
        size: 90,
      });
      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 0,
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
      //
      let openFee = calcOpenFee({
        sizeDelta: params._sizeDelta,
      });
      //
      let fees = buildFees({
        openFee: openFee,
        fundFee: fundingFee,
      });
      //
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
      //calc pnl
      let result = calcPNL({
        position: position,
        price: 50000,
      });
      //
      let avg = calAveragePrice({
        position: position,
        sizeDelta: params._sizeDelta,
        marketPrice: oracelPrice,
        pnl: result.pnl,
        hasProfit: result.hasProfit,
      });
      //calc collD
      let collD = params.collateralDelta.sub(totalFee);

      //Open Position
      let lastTx = await increasePosition(params);
      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Get the market balance after the transaction is completed
      let afterMarketAmount = await balanceOf(allContracts.market.address);

      //
      let afterAmount = await balanceOf(owner.address);
      //Get AUM after the transaction is completed
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );

      //Calculate the funds that the market should receive
      let marketAmount = calcMarketAmount({
        amount: params.collateralDelta,
        fee: totalFee,
      });


      validBalanceChange(afterCalcAUM, afterAum, "checkAUM bal");

      //check borrowsize
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check market borrow size"
      );

      //check  market balance changes
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
      );
      //check  user bal
      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user balance changes"
      );

      //check size
      await validSize({
        user: owner.address,
        price: 40000,
        size: 180,
      });

      //Get the  user current position
      position = await getCurrentPosition({
        user: owner.address,
        price: 50000,
        isLong: true,
      });

      //Calculate PNL locally,
      result = calcPNL({
        position: position,
        price: 50000,
      });

      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      //build event param
      let eventArg = [
        owner.address, //account
        params.collateralDelta, //collateralDelta
        collD, //collD
        params._sizeDelta, //size
        true, //isLong
        oracelPrice, //oraclePrice
        pnl, //pnl
        fees, //fees []int
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        0, //category
        0, //fromOrder
      ];
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
        price: 0,
        isLong: true,
        price0: avg,
      });
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
        label: "check  the amount transferred by the user to the market",
      });

      let totalCollateral = params.collateralDelta.add(params.collateralDelta);
      let totalsFee = totalFee.add(totalFee);

      //check collateral
      await validCollateral({
        user: owner.address,
        price: 40000,
        isLong: params._isLong,
        coll: calcCollateral({
          pay: totalCollateral,
          fees: totalsFee,
        }),
      });

      //build event param
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArg,
      });
    }
  });
});
