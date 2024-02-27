const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreaseOrderParam,
  buildFees,
} = require("../../../utils/buildParams");
const {
  connectUpdateOrder,
} = require("../../../../../scripts/market/marketRouter");
const {
  getOrderInfo,
  priceToBigNumber,
  getCurrentPosition,
  calcOpenFee,
  numberToBigNumber,
  totalFees,
  calcCollateral,
  calAveragePrice,
  calcSlippagePrice,
  getFundFee,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  vaildOrderCreated,
  vaildUpdateOrderEvent,
  vaildDeleteOrderEvent,
  vaildIncreaseOrder,
} = require("../../../utils/vaildOrder");
const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  checkIndexAutoOrderMock,
  performIndexAutoOrderMock,
  deployAutoOrderMock,
} = require("../../../../../scripts/am/autoOrderMock");
const {
  validTransfer,
  validSize,
  validCollateral,
  validAvgPrice,
  validBalanceChange,
  vaildOrderExist,
} = require("../../../utils/vaildData");
const {
  grantRoleIfNotGranted,
} = require("../../../../../scripts/utils/helpers");
const { expect } = require("chai");
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
const { ordersIndex } = require("../../../../../scripts/order/orderStore");
const { BigNumber } = require("ethers");

describe("increaseLimit", async () => {
  let allContracts;
  let owner, second, third;

  beforeEach(async () => {
    allContracts = await readServiceAllMarket();
    [owner, second, third] = await ethers.getSigners();
    await execCancelOrderAndLiqPosition({
      users: [owner, second, third],
      market: allContracts.market.address,
      orderBookLong: allContracts.orderBookLong,
      orderBookShort: allContracts.orderBookShort,
      indexToken: allContracts.indexToken,
    });
  });

  it("increaseLimit", async () => {
    logger.info("---test increaseLimit ---");
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1000,
    });
    //Construct pending order parameters
    let params = buildIncreaseOrderParam({
      market: allContracts.market.address,
      pay: 10,
      size: 100,
      price: 1000,
      tp: 1100,
      sl: 900,
    });

    let orderID = await ordersIndex(owner.address, "0");
    if (orderID.eq(0)) {
      orderID = BigNumber.from(1);
    }

    {
      //Calculate the price after including slippage
      let triggerPrice = calcSlippagePrice({
        price: params._order.price,
        isLong: params._isLong,
        isOpen: params.isCreate,
        slippage: 30,
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
      //The cost of constructing this transaction before sending a transaction
      let fees = buildFees({
        openFee: calcOpenFee({ sizeDelta: params._order.size }),
        execFee: numberToBigNumber(1),
        fundFee: fundingFee,
      });

      let totalFee = totalFees(fees);
      //check
      vaildIncreaseOrder({
        params: params,
        fees: totalFee,
      });

      //send a transaction
      let lastTx = await connectUpdateOrder(owner, params);
      //build the parameter list for check the order
      let args = [
        owner.address, //account,
        orderID, //orderID,
        params._order.collateral, //collateral
        params._order.size, //size
        triggerPrice, //price
        params._order.extra1, //tp
        params._order.extra0, //sl
      ];
      await vaildOrderExist({
        user: owner.address,
        orderID,
        label: "0",
      });
      //Whether check order is written to orderStore and check parameters
      let order = await getOrderInfo({
        user: owner.address,
        orderID,
        label: "0",
      });
      //check parameters
      vaildOrderCreated({
        order,
        args,
      });
      //build UpdateOrder Event
      let updateEventArgs = [
        owner.address, //account
        true, //isLong
        true, //isIncrease
        orderID, //orderId,
        allContracts.market.address, // market
        params._order.size, //size
        params._order.collateral, //collateral
        triggerPrice, //triggerPrice
        false,
        params._order.extra1, //tp
        params._order.extra0, //sl
        0,
        true,
      ];
      //check event
      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [updateEventArgs],
      });
      //check  the amount of the user's pending order
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 10,
        label: "check  the amount of the user's pending order",
      });
    }

    //Set the oracle price
    await setPrice(allContracts.indexToken, 800);

    //execute order
    {
      let position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });

      let beforeOrderId = await ordersIndex(owner.address, "1");
      if (beforeOrderId.eq(0)) {
        beforeOrderId = BigNumber.from(1);
      }

      //Get market balances before trading
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();

      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      let execOrders = await checkIndexAutoOrderMock(0, 100, true, true);
      expect(execOrders.length, "Get order quantity does not match").to.equal(
        1
      );
      //Build fees
      let fees = buildFees({
        openFee: calcOpenFee({ sizeDelta: execOrders[0].size }),
        execFee: numberToBigNumber(1),
      });

      let totalFee = totalFees(fees);
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      //execute order;
      let lastTx = await performIndexAutoOrderMock(0, 100, true, true);
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      validBalanceChange(
        params._order.size,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "check order bal"
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

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

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
        orderID, //order
        allContracts.market.address, //market
        3, //delete reason: exec is executed
        priceToBigNumber(800), //triggerAbove
        0, //pnl
      ];

      //build UpdateOrderEvent params,
      let updateEventTpArg = [
        owner.address, // account
        true, //isLong
        false, // isOpen
        beforeOrderId, //orderID
        allContracts.market.address, // market
        params._order.size, // size
        0, //collateral
        params._order.extra1, // price+sliple
        true, //getTriggerAbove
        0, //
        0, //
        orderID, //fromOrder
        false, //isKeepLev
      ];
      //build UpdateOrderEvent params
      let updateEventSlArg = [
        owner.address, // account
        true, //isLong
        false, // isOpen
        beforeOrderId.add(1), //orderID
        allContracts.market.address, // market
        params._order.size, // size
        0, //collateral
        params._order.extra0, // price+sliple
        false, //getTriggerAbove
        0, //
        0, //
        orderID, //fromOrder
        false, //isKeepLev
      ];
      let updateEventArg = [updateEventTpArg, updateEventSlArg];

      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [delEventArg],
      });

      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: updateEventArg,
      });

      await validSize({
        user: owner.address,
        price: 0,
        isLong: true,
        size: 100,
      });

      await validCollateral({
        user: owner.address,
        price: 0,
        isLong: true,
        coll: calcCollateral({
          pay: params._order.collateral,
          fees: totalFee,
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
          marketPrice: priceToBigNumber(800),
          pnl: 0,
          hasProfit: true,
        }),
      });

      validBalanceChange(
        totalFee,
        beforeMarketAmount.sub(afterMarketAmount),
        "check  market balance changes"
      );
    }
  });
});
