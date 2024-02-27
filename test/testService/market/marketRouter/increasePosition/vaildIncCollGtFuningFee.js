const {
  increasePosition,
  connectIncreasePosition,
} = require("../../../../../scripts/market/marketRouter");

const { getPrice } = require("../../../../../scripts/mock/oracle");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { expect } = require("chai");

const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const {
  advanceOneDay,
  getCurrentPosition,
  totalFees,
  calcOpenFee,
  calcMarketAmount,
  calcCollateral,
  calAveragePrice,
  numberToBigNumber,
  calcPNL,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  buildIncreasePositionParam,
  buildFees,
} = require("../../../utils/buildParams");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  validCollateral,
  validTransfer,
  validFundFee,
  validSize,
  vaildUpdatePositionEvent,
  validBalanceChange,
  validAvgPrice,
  validPnl,
} = require("../../../utils/vaildData");
const { execPrePare } = require("../../../utils/buildLogic");
const { vaildPosition } = require("../../../utils/vaildPosition");
const { getFundingFee } = require("../../../utils/fundingFee");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
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

  it("Increase the event trigger corresponding to the position check", async () => {
    logger.info(
      "---Increase the event trigger corresponding to the position check---"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 20,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1700,
    });

    //Open Position
    {
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 1700,
        pay: 20,
        size: 200,
      });
      //
      await validSize({
        user: owner.address,
        price: 0,
        isLong: true,
        size: 0,
      });
      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 1700,
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
      //Get the market balance before the transaction is initiated
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      let beforeAmount = await balanceOf(owner.address);
      //Open Position
      let lastTx = await increasePosition(params);

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
        "Check AUM value change"
      );
      //Only Open Position AUM will not change anything
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //Calculate the funds that the market should receive
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
        "Check borrow size changes"
      );

      //check  user balance changes
      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check collateral changes"
      );

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
        0, //category
        0, //fromOrder
      ];

      //check  user's position after trade execution
      await validSize({
        user: owner.address,
        price: 1700,
        size: 200,
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
        amount: 20,
        label: "check  the amount transferred by the user to the market",
      });

      //check collateral
      await validCollateral({
        user: owner.address,
        price: 1700,
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

    await advanceOneDay();
    {
      //Build position opening parameters
      let paramsSecond = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 1700,
        pay: 20,
        size: 200,
      });

      await userMintAndApprove(second, 20, allContracts.marketRouter);
      //
      await validSize({
        user: second.address,
        price: 1700,
        isLong: true,
        size: 0,
      });
      await connectIncreasePosition(second, paramsSecond);
      await validSize({
        user: second.address,
        price: 1700,
        isLong: true,
        size: 200,
      });
    }

    {
      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 1700,
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
      expect(fundingFee, "funding fee >0").gt(0);

      const addColl = 10;
      await userMintAndApprove(owner, addColl, allContracts.marketRouter);
      //
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        pay: addColl,
        price: 0,
        size: 0,
      });

      // check user size
      await validSize({
        user: owner.address,
        price: 0,
        size: 200,
      });
      //
      //
      let fees = buildFees({
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
      let beforeAmount = await balanceOf(owner.address);
      //Open Position
      let lastTx = await increasePosition(params);

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
        "Check AUM value change"
      );
      //Only Open Position AUM will not change anything
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //Calculate the funds that the market should receive
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
      //
      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check collateral changes"
      );

      //check
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow size changes"
      );

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
        2, //category
        0, //fromOrder
      ];

      //check  user's position after trade execution
      await validSize({
        user: owner.address,
        price: 1700,
        size: 200,
      });

      let totalCollateral = params.collateralDelta.add(numberToBigNumber(20));

      let totalsFee = totalFee.add(
        calcOpenFee({ sizeDelta: numberToBigNumber(200) })
      );
      position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });

      let result = calcPNL({
        position,
        price: 1700,
      });

      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      await validPnl({
        user: owner.address,
        price: 1700,
        isLong: true,
        pnl: pnl,
      });

      await validCollateral({
        user: owner.address,
        price: 1700,
        isLong: params._isLong,
        coll: calcCollateral({
          pay: totalCollateral,
          fees: totalsFee,
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
        amount: addColl,
        label: "check  the amount transferred by the user to the market",
      });

      await validFundFee({
        user: owner.address,
        market: allContracts.market.address,
        isLong: true,
        amount: 0,
      });
    }
  });
});
