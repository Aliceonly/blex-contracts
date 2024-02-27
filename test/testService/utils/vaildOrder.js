const { expect } = require("chai");
const { getOrderKey } = require("./utils");
const { containsKey } = require("../../../scripts/order/orderStore");
const {
  validTPSL,
  validSize,
  validCollateralDelta,
} = require("./vaildPosition");

function vaildOrderCreated({ order, args }) {
  // console.log(order);
  expect(
    order.account,
    "The order owner does not correspond to the expected order owner"
  ).eq(args[0]);
  expect(
    order.orderID,
    "The order ID does not correspond to the expected order ID"
  ).eq(args[1]);
  expect(
    order.collateral,
    "The order payment amount does not correspond to the expected order payment amount"
  ).eq(args[2]);
  expect(
    order.size,
    "The order size cannot correspond to the expected order size"
  ).eq(args[3]);
  expect(
    order.price,
    "The order price does not correspond to the expected order price"
  ).eq(args[4]);
  expect(
    order.extra1,
    "The take-profit price set by the order cannot correspond to the desired take-profit price"
  ).eq(args[5]);
  expect(
    order.extra0,
    "The stop loss price set by the order cannot correspond to the desired stop loss price"
  ).eq(args[6]);
}

async function vaildDeleteOrderEvent({ contract, tx, args }) {
  const name = "DeleteOrder";
  const events = await contract.queryFilter(name, tx.blockNumber);

  for (let i = 0; i < events.length; i++) {
    expect(
      events[i].args.account,
      "DeleteOrder  event emit account  params error"
    ).eq(args[i][0]);
    expect(
      events[i].args.isLong,
      "DeleteOrder  event emit isLong  params error"
    ).eq(args[i][1]);
    expect(
      events[i].args.isIncrease,
      "DeleteOrder  event emit isIncrease  params error"
    ).eq(args[i][2]);
    expect(
      events[i].args.orderID,
      "DeleteOrder  event emit orderID  params error"
    ).eq(args[i][3]);
    expect(
      events[i].args.market,
      "DeleteOrder  event emit market  params error"
    ).eq(args[i][4]);
    expect(
      events[i].args.reason,
      "DeleteOrder  event emit reason  params error"
    ).eq(args[i][5]);
    expect(
      events[i].args.price,
      "DeleteOrder  event emit price  params error"
    ).eq(args[i][6]);
    expect(
      events[i].args.dPNL,
      "DeleteOrder  event emit dPNL  params error"
    ).eq(args[i][7]);
  }
}

async function vaildUpdateOrderEvent({ contract, tx, args }) {
  const name = "UpdateOrder";
  const events = await contract.queryFilter(name, tx.blockNumber);
  expect(events.length, " not UpdateOrder Event emit").gt(0);
  for (let index = 0; index < events.length; index++) {
    // console.log(" args[index][3]", args[index][3], events[index].args.orderID);
    expect(
      events[index].args.account,
      "UpdateOrder  event emit account  params error"
    ).eq(args[index][0]);
    expect(
      events[index].args.isLong,
      "UpdateOrder  event emit isLong  params error"
    ).eq(args[index][1]);
    expect(
      events[index].args.isIncrease,
      "UpdateOrder  event emit isIncrease  params error"
    ).eq(args[index][2]);
    expect(
      events[index].args.orderID,
      "UpdateOrder  event emit orderID  params error"
    ).eq(args[index][3]);
    expect(
      events[index].args.market,
      "UpdateOrder  event emit market  params error"
    ).eq(args[index][4]);
    expect(
      events[index].args.size,
      "UpdateOrder  event emit size  params error"
    ).eq(args[index][5]);
    expect(
      events[index].args.collateral,
      "UpdateOrder  event emit collateral  params error"
    ).eq(args[index][6]);
    expect(
      events[index].args.triggerPrice,
      "UpdateOrder  event emit triggerPrice  params error"
    ).eq(args[index][7]);
    expect(
      events[index].args.triggerAbove,
      "UpdateOrder  event emit triggerAbove  params error"
    ).eq(args[index][8]);
    expect(
      events[index].args.tp,
      "UpdateOrder  event emit tp  params error"
    ).eq(args[index][9]);
    expect(
      events[index].args.sl,
      "UpdateOrder  event emit sl  params error"
    ).eq(args[index][10]);
    expect(
      events[index].args.fromOrder,
      "UpdateOrder  event emit fromOrder  params error"
    ).eq(args[index][11]);
    expect(
      events[index].args.isKeepLev,
      "UpdateOrder  event emit isKeepLev  params error"
    ).eq(args[index][12]);
    //expect(event.args.params,"UpdateOrder  event emit params  params error").eq(args[13])
  }
}

function vaildIncreaseOrder({ params, fees }) {
  validTPSL({
    triggerPrice: params._order.price,
    tpPrice: params._order.extra1,
    slPrice: params._order.extra0,
    isLong: params._isLong,
  });

  validSize({
    size: 0,
    sizeDelta: params._order.price,
    isIncrease: true,
  });
  //check collateral
  validCollateralDelta({
    busType: 1,
    collateral: 0,
    collateralDelta: params._order.collateral,
    size: 0,
    sizeDelta: params._order.size,
    fees: fees,
  });
}

module.exports = {
  vaildOrderCreated,
  vaildDeleteOrderEvent,
  vaildUpdateOrderEvent,
  vaildUpdateOrderEvent,
  vaildIncreaseOrder,
};
