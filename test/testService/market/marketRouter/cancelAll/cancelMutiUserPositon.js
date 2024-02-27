const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const {
  buildIncreasePositionParam,
  buildFees,
  buildIncreaseOrderParam,
  buildDecreaseOrderParam,
} = require("../../../utils/buildParams");
const {
  validSize,
  vaildOrderExist,
  validOrdersDeleted,
  validBalanceChange,
} = require("../../../utils/vaildData");
const {
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  numberToBigNumber,
  calcCloseFee,
  calcSlippagePrice,
  getOrderInfo,
  logger,
} = require("../../../utils/utils");
const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
const { vaildDecreaseOrder } = require("../../../utils/vaildPosition");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  getMarketFundsUsed,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  connectUpdateOrder,
  setIsEnableMarketConvertToOrder,
  connectIncreasePosition,
  connectCancelOrderList,
} = require("../../../../../scripts/market/marketRouter");
const {
  vaildIncreaseOrder,
  vaildOrderCreated,
  vaildUpdateOrderEvent,
  vaildDeleteOrderEvent,
} = require("../../../utils/vaildOrder");
const {
  getAccountOrderNumber,
  ordersIndex,
} = require("../../../../../scripts/order/orderStore");
const { BigNumber } = require("ethers");

describe("Cancel all orders (including different users)", async () => {
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

  it("Cancel all orders (including different users)", async () => {
    logger.info("---Cancel all orders (including different users)---");
    //Preparation
    let users = [owner, second, third];

    await setIsEnableMarketConvertToOrder(false);
    await setPrice(allContracts.indexToken, 1700);

    //Initiate transactions with different users in a loop
    for (let index = 0; index < users.length; index++) {
      let orderIDsArr = new Array(30);
      let limitOrders = new Array(20);
      let triggerOrders = new Array(10);
      //increase position
      {
        await userMintAndApprove(users[index], 200, allContracts.marketRouter);

        let incParams = buildIncreasePositionParam({
          market: allContracts.market.address,
          price: 1700,
          pay: 200,
          size: 2000,
        });

        //Validate positions before trade execution
        await validSize({
          user: users[index].address,
          price: 1700,
          size: 0,
        });
        //increase position
        let lastTx = await connectIncreasePosition(users[index], incParams);

        //Validate positions before trade execution
        await validSize({
          user: users[index].address,
          price: 1700,
          size: 2000,
        });
      }
      //Add 20 orders
      for (let num = 0; num < 20; num++) {
        await userMintAndApprove(users[index], 20, allContracts.marketRouter);
        let inputs = buildIncreaseOrderParam({
          market: allContracts.market.address,
          pay: 20,
          size: 200,
          price: 1100,
          tp: 1300,
          sl: 900,
        });
        let orderID = await ordersIndex(users[index].address, "0");
        if (orderID.eq(0)) {
          orderID = BigNumber.from(1);
        }
        orderIDsArr[num] = orderID;
        limitOrders[num] = orderID;
        //Build fees
        let fees = buildFees({
          openFee: calcOpenFee({ sizeDelta: inputs._order.size }),
          execFee: numberToBigNumber(1),
        });
        let totalFee = totalFees(fees);
        //check add order
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

        //Build the parameters needed to trigger the UpdateOrder event
        let eventArg = [
          users[index].address, //account
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
        let lastTx = await connectUpdateOrder(users[index], inputs);
        //Check event
        await vaildUpdateOrderEvent({
          contract: allContracts.marketRouter,
          tx: lastTx,
          args: [eventArg],
        });

        //Construct the validation parameters of the order
        let vaildOrderArgs = [
          users[index].address, //account
          orderID, //orderID,
          inputs._order.collateral, //collateral
          inputs._order.size, //size
          triggerPrice, //price
          inputs._order.extra1, //tp
          inputs._order.extra0, //sl
        ];

        let orderInfo = await getOrderInfo({
          user: users[index].address,
          orderID,
          label: "0",
        });
        //check  that the order exists and check  the corresponding parameters
        vaildOrderCreated({
          order: orderInfo,
          args: vaildOrderArgs,
        });
      }
      //10 orders
      for (let num = 0; num < 10; num++) {
        let orderID = await ordersIndex(users[index].address, "1");
        if (orderID.eq(0)) {
          orderID = BigNumber.from(1);
        }
        orderIDsArr[20 + num] = orderID;
        triggerOrders[num] = orderID;

        let inputs = buildDecreaseOrderParam({
          market: allContracts.market.address,
          price: 1700,
          size: 10,
        });
        //Get the  user current position
        let position = await getCurrentPosition({
          user: users[index].address,
          price: 1700,
          isLong: true,
        });

        //List of fees required to construct this lighten-up
        let fees = buildFees({
          closeFee: calcCloseFee({ sizeDelta: inputs._order.size }),
        });
        let totalFee = totalFees(fees);
        //Get oracle price
        let oraclePrice = await getPrice(allContracts.indexToken, false);

        //Calculate the margin for this time to reduce the position
        let collateralDelta = position.collateral.div(200);
        //Get how many orders the user has placed

        let decrOrderCount = await getAccountOrderNumber(
          users[index].address,
          "1"
        );
        //check decrease position parameters
        vaildDecreaseOrder({
          collateral: position.collateral,
          collateralDelta: inputs._order.size,
          size: position.size,
          sizeDelta: inputs._order.size,
          fees: totalFee,
          decrOrderCount: decrOrderCount,
        });

        //build parameterslist
        let eventArg = [
          users[index].address, //account
          true, //isLong
          false, //isOpen
          orderID, //orderID
          allContracts.market.address, //market
          inputs._order.size, //size
          collateralDelta, //collateral
          oraclePrice, //price
          false, //getTriggerAbove
          0, //tp
          0, //sl
          0, //fromOrder
          true, //isKeepLev()
          inputs,
        ];

        let lastTx = await connectUpdateOrder(users[index], inputs);

        //Construct the validation parameters of the order
        let vaildOrderArgs = [
          users[index].address, //account
          orderID, //orderID,
          collateralDelta, //collateral
          inputs._order.size,
          oraclePrice,
          inputs._order.extra1,
          inputs._order.extra0,
        ];

        //Query whether the order has been inserted
        await vaildOrderExist({
          user: users[index].address,
          orderID,
          label: "1",
        });

        //check  event parameters
        await vaildUpdateOrderEvent({
          contract: allContracts.marketRouter,
          tx: lastTx,
          args: [eventArg],
        });
        //Get the order data written into the contract for this transaction
        let orderInfo = await getOrderInfo({
          user: users[index].address,
          orderID,
          label: "1",
        });
        //check  the data written this time
        vaildOrderCreated({
          order: orderInfo,
          args: vaildOrderArgs,
        });
      }

      {
        let beforeAmount = await balanceOf(users[index].address);
        const numOrders = 30;
        const firstHalf = Array(20).fill(true);
        const anotherHalf = Array(10).fill(false);
        const isIncreaseList = [...firstHalf, ...anotherHalf];
        let marketArr = Array(numOrders).fill(allContracts.market.address);
        let isLong = Array(numOrders).fill(true);
        let oracelPrice = await getPrice(allContracts.indexToken, true);
        let cancelEvent = new Array(numOrders);

        for (let orderIds = 0; orderIds < 20; orderIds++) {
          let eventArgs = [
            users[index].address,
            true,
            true,
            limitOrders[orderIds],
            allContracts.market.address,
            5,
            oracelPrice,
            0,
          ];

          cancelEvent[orderIds] = eventArgs;
        }

        for (let orderIds = 0; orderIds < 10; orderIds++) {
          let eventArgs = [
            users[index].address,
            true,
            false,
            triggerOrders[orderIds],
            allContracts.market.address,
            5,
            oracelPrice,
            0,
          ];
          cancelEvent[20 + orderIds] = eventArgs;
        }

        let lastTx = await connectCancelOrderList(
          users[index],
          marketArr,
          isIncreaseList,
          orderIDsArr,
          isLong
        );
        await vaildDeleteOrderEvent({
          contract: allContracts.marketRouter,
          tx: lastTx,
          args: cancelEvent,
        });

        //check  that the order should have been removed
        await validOrdersDeleted({
          user: users[index].address,
          orderIDs: limitOrders,
          label: "0",
        });

        await validOrdersDeleted({
          user: users[index].address,
          orderIDs: triggerOrders,
          label: "1",
        });
        let afterAmount = await balanceOf(users[index].address);
        //Funds refunded to user after order was deleted
        validBalanceChange(
          numberToBigNumber(20 * 20),
          afterAmount.sub(beforeAmount),
          "check delete order funds refund"
        );
      }
    }


  });
});
