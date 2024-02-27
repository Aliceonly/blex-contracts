const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildFees,
  buildIncreaseOrderParam,
} = require("../../../utils/buildParams");
const {
  validBalanceChange,
  validOrdersDeleted,
  validTransfer,
} = require("../../../utils/vaildData");
const {
  calcOpenFee,
  totalFees,
  numberToBigNumber,
  calcSlippagePrice,
  getOrderInfo,
  logger,
} = require("../../../utils/utils");
const { getPrice } = require("../../../../../scripts/mock/oracle");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  updateOrder,
  cancelOrderList,
} = require("../../../../../scripts/market/marketRouter");
const {
  vaildIncreaseOrder,
  vaildOrderCreated,
  vaildUpdateOrderEvent,
  vaildDeleteOrderEvent,
} = require("../../../utils/vaildOrder");
const { ordersIndex } = require("../../../../../scripts/order/orderStore");

describe("Delete Open Positions with multiple ids at the same time", async () => {
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

  it("Delete Open Positions with multiple ids at the same time", async () => {
    logger.info(
      "---Delete Open Positions with multiple ids at the same time---"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 200,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1100,
    });
    let orderIdArr = new Array(5);
    //Add 5 limit orders
    {
      for (let index = 0; index < 5; index++) {
        let orderID = await ordersIndex(owner.address, "0");
        orderIdArr[index] = orderID;
        //Build limit order parameter
        let params = buildIncreaseOrderParam({
          market: allContracts.market.address,
          pay: 20,
          size: 200,
          price: 1100,
          tp: 1300,
          sl: 900,
        });
        //Build fees
        let fees = buildFees({
          openFee: calcOpenFee({ sizeDelta: params._order.size }),
          execFee: numberToBigNumber(1),
        });
        let totalFee = totalFees(fees);
        //check add order
        vaildIncreaseOrder({
          params,
          fees: totalFee,
        });

        //Calculate slippage
        let triggerPrice = calcSlippagePrice({
          price: params._order.price,
          isLong: true,
          isOpen: true,
          slippage: 30,
        });
        //Build the parameters needed to trigger the UpdateOrder event
        let eventArg = [
          owner.address, //account
          true, //isLong
          true, //isOpen
          orderID, //orderID
          allContracts.market.address, //market
          params._order.size, //size
          params._order.collateral, //collateral collateral  for this reduction
          triggerPrice, //
          false, //getTriggerAbove()
          params._order.extra1, //Take profit point
          params._order.extra0, //stop loss point
          0, //fromOrder
          true, //whether to keep leverage
        ];
        //send a transaction
        let lastTx = await updateOrder(params);

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
          params._order.collateral, //collateral
          params._order.size,
          triggerPrice,
          params._order.extra1,
          params._order.extra0,
        ];

        let orderInfo = await getOrderInfo({
          user: owner.address,
          orderID: orderID,
          label: "0",
        });

        vaildOrderCreated({
          order: orderInfo,
          args: vaildOrderArgs,
        });

        //check  the amount of the user's pending order
        await validTransfer({
          tokenContract: allContracts.USDC,
          blockNumber: lastTx.blockNumber,
          from: owner.address,
          to: allContracts.market.address,
          amount: 20,
          label: "check  the amount of the user's pending order error",
        });
      }
    }
    {
      let beforeAmount = await balanceOf(owner.address);
      //Get the parameters required to construct the event
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      let marketArray = Array(5).fill(allContracts.market.address);
      let increaseArray = Array(5).fill(true);
      let orderArray = orderIdArr;
      let longList = Array(5).fill(true);
      let lastTx = await cancelOrderList(
        marketArray,
        increaseArray,
        orderArray,
        longList
      );

      //build event parameter list
      let totalCancelEvent = new Array(5);
      for (let index = 0; index < 5; index++) {
        let eventArg = [
          owner.address,
          true,
          true,
          orderIdArr[index],
          allContracts.market.address,
          5,
          oracelPrice,
          0,
        ];
        totalCancelEvent[index] = eventArg;
      }
      let afterAmount = await balanceOf(owner.address);

      //Check event and  parameter
      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: totalCancelEvent,
      });
      //check  if the order should be deleted
      await validOrdersDeleted({
        user: owner.address,
        orderIDs: orderIdArr,
        label: "0",
      });
      //check  refund of funds
      validBalanceChange(
        numberToBigNumber(5 * 20),
        afterAmount.sub(beforeAmount),
        "check  cancel order return order"
      );
    }
  });
});
