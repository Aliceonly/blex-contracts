const { ethers } = require("hardhat");
const {
  readServiceAllMarket,
  userMintAndApprove,
  deployServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildFees,
  buildDecreaseOrderParam,
  buildIncreaseOrderParam,
} = require("../../../utils/buildParams");
const {
  validSize,
  validBalanceChange,
  validTransfer,
  vaildUpdatePositionEvent,
  vaildOrderExist,
  validCollateral,
  validPnl,
  validAvgPrice,
} = require("../../../utils/vaildData");
const {
  getSize,
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  calcCollateral,
  getCollateral,
  calcCloseFee,
  numberToBigNumber,
  getOrderInfo,
  calcPNL,
  priceToBigNumber,
  calcSlippagePrice,
  calAveragePrice,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
const {
  vaildPosition,
  getDecreaseDeltaCollateral,
  vaildDecreaseOrder,
} = require("../../../utils/vaildPosition");
const {
  getMarketFundsUsed,
  getUSDBalance,
  getGlobalPnl,
  getAUM,
} = require("../../../../../scripts/vault/vaultRouter");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  increasePosition,
  connectUpdateOrder,
  updateOrder,
} = require("../../../../../scripts/market/marketRouter");
const {
  ordersIndex,
  getAccountOrderNumber,
} = require("../../../../../scripts/order/orderStore");
const {
  vaildUpdateOrderEvent,
  vaildIncreaseOrder,
  vaildOrderCreated,
  vaildDeleteOrderEvent,
} = require("../../../utils/vaildOrder");
const { expect } = require("chai");
const {
  checkIndexAutoOrderMock,
  performIndexAutoOrderMock,
} = require("../../../../../scripts/am/autoOrderMock");
const { BigNumber } = require("ethers");
//39747921357501352218266896438948917

describe("auto", async () => {
  let allContracts;
  let owner, second, third;
  beforeEach(async () => {
    allContracts = await readServiceAllMarket();
    [owner, second, third] = await ethers.getSigners();

    await execCancelOrderAndLiqPosition({
      users: [owner, second, third],
      orderBookLong: allContracts.orderBookLong,
      orderBookShort: allContracts.orderBookShort,
      market: allContracts.market.address,
      indexToken: allContracts.indexToken,
    });
  });

  it("The user trigger order has not been executed yet, the number of orders that can be executed by the robot should be 0", async () => {
    logger.info(
      "---The user trigger order has not been executed yet, the number of orders that can be executed by the robot should be 0---"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });
    //Used to hold collateral  balances
    let afterCollD;
    //increase position
    {
      //Build and increase position parameters
      let incParams = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 10,
        size: 90,
      });

      //Get user positions for data verification before trading
      let position = await getCurrentPosition({
        user: owner.address,
        price: 40000,
        isLong: incParams._isLong,
      });

      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        incParams._isLong
      );
      //Calculate Funding Fee
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });
      //Construct the fee list required for this transaction
      let fees = buildFees({
        openFee: calcOpenFee({
          sizeDelta: incParams._sizeDelta,
        }),
        fundFee: fundingFee,
      });

      //Accumulate the fees
      let totalFee = totalFees(fees);

      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);

      incParams._oraclePrice = oracelPrice;

      //Data verification before transaction execution
      vaildPosition({
        params: incParams,
        position,
        fees,
      });
      let collD = incParams.collateralDelta.sub(totalFee);
      //Build event parameter list
      let eventArgs = [
        owner.address,
        incParams.collateralDelta,
        collD,
        incParams._sizeDelta,
        true,
        oracelPrice,
        0,
        fees,
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        0, //category
        0, //fromOrder
      ];

      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Access to market funding before trades are initiated
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get user balance before transaction is initiated
      let beforeAmount = await balanceOf(owner.address);

      //Get the user's position before the transaction for later verification of the position
      let beforeSize = await getSize({
        user: owner.address,
        price: 40000,
        isLong: true,
      });

      //increase position
      let lastTx = await increasePosition(incParams);

      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Get user balance after transaction is completed
      let afterAmount = await balanceOf(owner.address);

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

      //After the transaction is executed, the user's position is obtained and verified
      let afterSize = await getSize({
        user: owner.address,
        price: 40000,
        isLong: true,
      });

      //Calculate the position collateral
      let coll = calcCollateral({
        pay: incParams.collateralDelta,
        fees: totalFee,
      });
      afterCollD = coll;
      //Get a deposit for now
      let afterColl = await getCollateral({
        user: owner.address,
        price: 40000,
        isLong: true,
      });

      //check  user collateral  changes
      validBalanceChange(
        coll,
        afterColl.sub(position.collateral),
        "check  user collateral  changes"
      );

      //Check whether the borrow size corresponds
      validBalanceChange(
        incParams._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow Size"
      );

      //check  user position changes
      validBalanceChange(
        incParams._sizeDelta,
        afterSize.sub(beforeSize),
        "check  user position changes"
      );

      //check  user balance changes
      validBalanceChange(
        incParams.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user balance changes"
      );

      //check  market balance changes
      validBalanceChange(
        coll,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
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

      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });

      //check  the balance change after the transaction execution is completed
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 10,
        label: "User transfers funds into the market",
      });
    }
    //Pending limit order
    {
      await userMintAndApprove(owner, 10, allContracts.marketRouter);
      //Construct pending order parameters
      let inputs = buildIncreaseOrderParam({
        market: allContracts.market.address,
        price: 40000 - 500,
        tp: 40000,
        sl: 40000 - 1000,
        pay: 10,
        size: 90,
      });

      let position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: inputs._isLong,
      });
      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        position.isLong
      );

      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });

      //Construct the list of fees required to execute the transaction
      let fees = buildFees({
        closeFee: calcOpenFee({ sizeDelta: inputs._order.size }),
        execFee: numberToBigNumber(1),
        fundFee: fundingFee,
      });
      //Add up various expenses
      let totalFee = totalFees(fees);

      vaildIncreaseOrder({
        params: inputs,
        fees: totalFee,
      });
      //Calculate slippage from market input[1]>0
      let triggerPrice = calcSlippagePrice({
        price: inputs._order.price,
        isLong: true,
        isOpen: true,
        slippage: 30,
      });

      let orderID = await ordersIndex(owner.address, "0");

      if (orderID.eq(0)) {
        orderID = BigNumber.from(1);
      }

      //Build the parameters needed to trigger the UpdateOrder event
      let eventArg = [
        owner.address, //account
        true, //isLong
        true, //isOpen
        orderID, //orderID
        allContracts.market.address, //market
        inputs._order.size, //size
        inputs._order.collateral, //collateral collateral  for this reduction
        triggerPrice, //
        false, //getTriggerAbove()
        inputs._order.extra1, //Take profit point
        inputs._order.extra0, //stop loss point
        0, //fromOrder
        true, //whether to keep leverage
      ];

      //send a transaction
      let lastTx = await updateOrder(inputs);

      //Check event
      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [eventArg],
      });

      //Construct the validation parameters of the order
      let vaildOrderArgs = [
        owner.address, //account
        orderID, //orderID,
        inputs._order.collateral, //collateral
        inputs._order.size, //size
        triggerPrice, //price
        inputs._order.extra1, //tp
        inputs._order.extra0, //sl
      ];

      let orderInfo = await getOrderInfo({
        user: owner.address,
        orderID,
        label: "0",
      });
      //check  that the order exists and check  the corresponding parameters
      vaildOrderCreated({
        order: orderInfo,
        args: vaildOrderArgs,
      });
    }
    let beforeAum = await getAUM();
    let beforeUSD = await getUSDBalance();
    let beforePNL = await getGlobalPnl();

    let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

    //Set the oracle price
    await setPrice(allContracts.indexToken, 40000 - 501);

    let afterAum = await getAUM();
    let afterUSD = await getUSDBalance();
    let afterPnl = await getGlobalPnl();
    let afterCalcAum = calcAUM(afterPnl, afterUSD);

    validBalanceChange(
      beforeCalcAum.sub(afterCalcAum),
      beforeAum.sub(afterAum),
      "Check AUM value change"
    );
    //execute order
    {
      let position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });

      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        position.isLong
      );

      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });

      //size before order execution
      let beforeSize = await getSize({
        user: owner.address,
        price: 0,
        isLong: true,
      });

      //Get executable orders
      let execOrders = await checkIndexAutoOrderMock(0, 100, true, true);
      expect(execOrders.length, "Get order quantity does not match").to.equal(
        1
      );
      //execute order

      let triggerPrice = await getPrice(allContracts.indexToken, true);

      //Construct the list of fees required to execute the transaction
      let fees = buildFees({
        closeFee: calcCloseFee({ sizeDelta: execOrders[0].size }),
        execFee: numberToBigNumber(1),
        fundFee: fundingFee,
      });
      //Add up various expenses
      let totalFee = totalFees(fees);

      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();
      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      let lastTx = await performIndexAutoOrderMock(0, 100, true, true);

      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Get the market balance after the transaction is completed
      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPnl = await getGlobalPnl();
      let afterCalcAum = calcAUM(afterPnl, afterUSD);

      validBalanceChange(
        afterCalcAum.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );
      validBalanceChange(afterCalcAum, afterAum, "Check AUM value");

      //Because the user's funds have already entered the market when the order is placed, the change in market funds is equal to the feeVault paid by the market
      validBalanceChange(
        totalFee,
        beforeMarketAmount.sub(afterMarketAmount),
        "check  market balance changes"
      );

      //Check borrow Size
      validBalanceChange(
        execOrders[0].size,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow Size"
      );
      //Successful order execution needs to check  feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "check  the amount transferred from market to feeVault",
        expandDecimals: false,
      });

      let delEventArg = [
        owner.address, //account
        true, //isLong
        true, //isOpen
        execOrders[0].orderID, //order
        allContracts.market.address, //market
        3, //delete reason: exec is executed
        triggerPrice, //triggerAbove
        0, //pnl
      ];

      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [delEventArg],
      });

      let afterSize = await getSize({
        user: owner.address,
        price: 0,
        isLong: true,
      });

      validBalanceChange(
        execOrders[0].size,
        afterSize.sub(beforeSize),
        "check  user position changes"
      );

      let result = calcPNL({
        position,
        price: 40000 - 501,
      });

      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      await validPnl({
        user: owner.address,
        price: 40000 - 501,
        isLong: true,
        pnl,
      });

      let orderColl = execOrders[0].collateral.sub(totalFee);

      await validCollateral({
        user: owner.address,
        price: 0,
        isLong: true,
        coll: calcCollateral({
          pay: position.collateral.add(orderColl),
          fees: 0,
        }),
      });

      //Check user average price
      await validAvgPrice({
        user: owner.address,
        price: 0,
        isLong: true,
        price0: calAveragePrice({
          position: position,
          sizeDelta: execOrders[0].size,
          marketPrice: triggerPrice,
          pnl: result.pnl,
          hasProfit: result.hasProfit,
        }),
      });
    }
  });
});
