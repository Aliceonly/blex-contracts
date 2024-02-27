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
  advanceOneDay,
  getCurrentPosition,
  totalFees,
  calcOpenFee,
  calcMarketAmount,
  calcCollateral,
  calAveragePrice,
  numberToBigNumber,
  getOrderInfo,
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
  vaildEvent,
  validSize,
  vaildUpdatePositionEvent,
  validBalanceChange,
  validAvgPrice,
  vaildOrdersExist,
  validOrdersDeleted,
} = require("../../../utils/vaildData");
const { execPrePare } = require("../../../utils/buildLogic");
const { vaildPosition, validTPSL } = require("../../../utils/vaildPosition");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const { ethers } = require("hardhat");
const {
  vaildUpdateOrderEvent,
  vaildOrderCreated,
} = require("../../../utils/vaildOrder");
const { ordersIndex } = require("../../../../../scripts/order/orderStore");
const { BigNumber } = require("ethers");

describe("Increase position, check stop loss order", async () => {
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

  it("Increase position, check stop loss order", async () => {
    logger.info("---Increase position, check stop loss order---");
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 20,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1700,
    });
    //Build position opening parameters
    let params = buildIncreasePositionParam({
      market: allContracts.market.address,
      price: 1700,
      pay: 20,
      size: 200,
      isLong: true,
    });

    {
      await validSize({
        user: owner.address,
        price: 0,
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
      //Get user balance before transaction is initiated
      let beforeAmount = await balanceOf(owner.address);

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
      //Open Position
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
        "Check AUM value change"
      );
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

      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check add coll amount"
      );
      //check
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow Size"
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

    //await advanceOneDay();
    {
      await userMintAndApprove(second, 20, allContracts.marketRouter);

      await validSize({
        user: second.address,
        price: 0,
        size: 0,
      });
      await connectIncreasePosition(second, params);

      await validSize({
        user: second.address,
        price: 1700,
        size: 200,
      });
    }


    {
      await userMintAndApprove(owner, 20, allContracts.marketRouter);
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
      let paramAdd = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 1700,
        pay: 20,
        size: 200,
        isLong: true,
        tp: 2000,
        sl: 1500,
      });
      await validSize({
        user: owner.address,
        price: 1700,
        size: 200,
      });
      let openFee = calcOpenFee({
        sizeDelta: paramAdd._sizeDelta,
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
      paramAdd._oraclePrice = oracelPrice;
      validTPSL({
        triggerPrice: paramAdd._price,
        tpPrice: paramAdd.inputs[0],
        slPrice: paramAdd.inputs[1],
      });

      // check  the position
      vaildPosition({
        params: paramAdd,
        position: position,
        fees: fees,
      });
      let startOrderID = await ordersIndex(owner.address, "1");
      if (startOrderID.eq(0)) {
        startOrderID = BigNumber.from(1);
      }
      await validOrdersDeleted({
        user: owner.address,
        orderIDs: [startOrderID, startOrderID.add(1)],
        label: "1",
      });
      //Get user balance before transaction is initiated
      let beforeAmount = await balanceOf(owner.address);
      //
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      let lastTx = await increasePosition(paramAdd);

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
        "Check AUM value change"
      );
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //Calculate the funds that the market should receive
      let marketAmount = calcMarketAmount({
        amount: paramAdd.collateralDelta,
        fee: totalFee,
      });
      validBalanceChange(
        paramAdd.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user balance changes"
      );

      validBalanceChange(
        paramAdd._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow Size"
      );
      //check  market balance changes
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
      );

      //Calculate the collD required for the emit event
      let collD = paramAdd.collateralDelta.sub(totalFee);

      //Build event parameter list
      let eventArgs = [
        owner.address, //account
        paramAdd.collateralDelta, //collateralDelta
        collD, //collD
        paramAdd._sizeDelta, //size
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
        size: 200 + 200,
      });

      let totalCollateral = position.collateral.add(paramAdd.collateralDelta);

      await validCollateral({
        user: owner.address,
        price: 1700,
        isLong: paramAdd._isLong,
        coll: calcCollateral({
          pay: totalCollateral,
          fees: totalFee,
        }),
      });
      //Check average price
      await validAvgPrice({
        user: owner.address,
        price: 0,
        isLong: paramAdd._isLong,
        price0: calAveragePrice({
          position: position,
          sizeDelta: paramAdd._sizeDelta,
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
        amount: 20,
        label: "check  the amount transferred by the user to the market",
      });

      await vaildOrdersExist({
        user: owner.address,
        orderIDs: [startOrderID, startOrderID.add(1)],
        label: "1",
      });

      //
      let updateTpEvent = [
        owner.address, // account
        true, //isLong
        false, // isOpen
        startOrderID, //orderID
        allContracts.market.address, // market
        paramAdd._sizeDelta, // size
        0, //collateral
        paramAdd.inputs[0], // price+sliple
        true, //getTriggerAbove
        0, //tp
        0, //sl
        0, //fromOrder
        false, //isKeepLev
      ];

      let updateSlEvent = [
        owner.address, // account
        true, //isLong
        false, // isOpen
        startOrderID.add(1), //orderID
        allContracts.market.address, // market
        paramAdd._sizeDelta, // size
        0, //collateral
        paramAdd.inputs[1], // price+sliple
        false, //getTriggerAbove
        0, //tp
        0, //sl
        0, //fromOrder
        false, //isKeepLev
      ];
      let events = [updateTpEvent, updateSlEvent];

      //
      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: events,
      });
      let orderinfoTp = await getOrderInfo({
        user: owner.address,
        orderID: startOrderID,
        label: "1",
      });
      let orderArgsTp = [
        owner.address, //
        startOrderID,
        0, //
        paramAdd._sizeDelta,
        paramAdd.inputs[0],
        0,
        0,
      ];
      vaildOrderCreated({
        order: orderinfoTp,
        args: orderArgsTp,
      });
      let orderinfoSl = await getOrderInfo({
        user: owner.address,
        orderID: startOrderID.add(1),
        label: "1",
      });

      let orderArgsSl = [
        owner.address, //
        startOrderID.add(1),
        0, //
        paramAdd._sizeDelta,
        paramAdd.inputs[1],
        0,
        0,
      ];
      vaildOrderCreated({
        order: orderinfoSl,
        args: orderArgsSl,
      });
    }
  });
});
