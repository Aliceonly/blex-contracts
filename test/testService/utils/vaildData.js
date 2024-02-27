const { expect } = require("chai");
const { containsKey } = require("../../../scripts/order/orderStore");
const { ethers } = require("hardhat");
const { BigNumber: BN, BigNumber } = require("ethers");
const { balanceOf } = require("../../../scripts/mock/erc20");
const { cancelOrderList } = require("../../../scripts/market/marketRouter");
const {
  getCurrentPosition,
  getFundFee,
  getOrderKey,
  numberToBigNumber,
  priceToBigNumber,
  getOrderInfo,
  logger,
} = require("./utils");
const { getMarketFundsUsed } = require("../../../scripts/vault/vaultRouter");
// const { Logger } = require("ethers/lib/utils");

const ERROR_ALLOW = BN.from("10000");

const COLLATERAL_TOKEN_DECIMAL = 18;

//position max/min lev size

async function validSize({ user, price, isLong = true, size }) {
  let position = await getCurrentPosition({
    user: user,
    price: price,
    isLong: isLong,
  });

  size = ethers.utils.parseUnits(size + "", COLLATERAL_TOKEN_DECIMAL);
  let reason = size.eq(position["size"]) ? "pass" : "fail";

  logger.info(
    "   The user expects the current position to be " +
      size.toString() +
      "   The user's actual position is " +
      position["size"].toString() +
      reason
  );
  console.log(
    "  The user expects the current position to be",
    size,
    "  The user's actual position is",
    position["size"],
    size.eq(position["size"]) ? "pass" : "fail"
  );

  expect(size, "sizecheckfailed").within(
    position["size"].sub(ERROR_ALLOW),
    position["size"].add(ERROR_ALLOW)
  );
}

async function validCollateral({ user, price, isLong = true, coll }) {
  await checkCollateral({
    user: user,
    price: price,
    isLong: isLong,
    coll: coll,
  });
}

async function validAvgPrice({ user, price, isLong = true, price0 }) {
  if (!BN.isBigNumber(price0)) {
    price0 = priceToBigNumber(price0);
  }
  let position = await getCurrentPosition({
    user: user,
    price: price,
    isLong: isLong,
  });
  console.log(
    "  The user expects the current average price to be",
    price0,
    "  user actual average price",
    position["averagePrice"],
    price0.eq(position["averagePrice"]) ? "pass" : "fail"
  );
  let reason = price0.eq(position["averagePrice"]) ? "pass" : "fail";

  logger.info(
    "  The user expects the current average price to be" +
      price0.toString() +
      "  user actual average price" +
      position["averagePrice"].toString() +
      reason
  );

  expect(price0, "validAvgPrice").within(
    position["averagePrice"].sub(ERROR_ALLOW),
    position["averagePrice"].add(ERROR_ALLOW)
  );
}

async function checkCollateral({ user, price, isLong = true, coll }) {
  let position = await getCurrentPosition({
    user: user,
    price: price,
    isLong: isLong,
  });
  if (!BigNumber.isBigNumber(coll)) {
    coll = BigNumber.from(0);
  }
  console.log(
    "The user expects the current margin to be",
    coll,
    "  User's actual margin",
    position["collateral"],
    coll.eq(position["collateral"]) ? "pass" : "fail"
  );

  let reason = coll.eq(position["collateral"]) ? "pass" : "fail";

  logger.info(
    "The user expects the current margin to be" +
      coll.toString() +
      "  User's actual margin" +
      position["collateral"].toString() +
      reason
  );

  expect(coll, " collateral  fail").within(
    position["collateral"].sub(ERROR_ALLOW),
    position["collateral"].add(ERROR_ALLOW)
  );
}

async function validPnl({ user, price, isLong = true, pnl }) {
  let position = await getCurrentPosition({
    user: user,
    price: price,
    isLong: isLong,
  });
  if (position == null) {
    expect(pnl, "pnlcheckfail").eq("0");
    return;
  }
  if (!BigNumber.isBigNumber(pnl)) {
    pnl = BigNumber.from(0);
  }

  console.log(
    "  The user expects the current pnl to be",
    pnl,
    "  User's actual margin",
    position["realisedPnl"],
    pnl.eq(position["realisedPnl"]) ? "pass" : "fail"
  );
  let reason = pnl.eq(position["realisedPnl"]) ? "pass" : "fail";
  logger.info(
    "  The user expects the current pnl to be" +
      pnl.toString() +
      "  User's actual margin" +
      position["realisedPnl"].toString() +
      reason
  );

  expect(pnl, "pnlcheckfail").within(
    position["realisedPnl"].sub(ERROR_ALLOW),
    position["realisedPnl"].add(ERROR_ALLOW)
  );
}
//const v = ethers.utils.parseUnits(pnl+'', COLLATERAL_TOKEN_DECIMAL)

// }
// logger.info(
//   "  The user expects the current pnl to be",
//   pnl,
//   "  User's actual margin",
//   position["realisedPnl"],
//   pnl.eq(position["realisedPnl"]) ? "pass" : "fail"
// );

// }

async function validOrdersDeleted({ user, orderIDs, label }) {
  for (const orderID of orderIDs) {
    expect(orderID, "Order ID cannot be 0").not.eq(0);

    let orderKey = getOrderKey(user, orderID);
    let exists = await containsKey(orderKey, label);

    expect(exists, "The order should be deleted").eq(false);
  }
}

async function validFundFee({ user, market, isLong = true, amount }) {
  const ff = await getFundFee({
    user,
    market,
    isLong,
  });

  expect(parseInt(ff), "funding fee").eq(amount);
}

async function vaildEvent({ contract, name, num, tx }) {
  const events = await contract.queryFilter(name, tx.blockNumber);
  expect(
    events.length,
    name + "The number of event triggers is wrong"
  ).to.be.equal(num);
}

async function validDeleteOrderEvent({ contract, num, orderID, tx }) {
  const name = "DeleteOrder";
  const events = await contract.queryFilter(name, tx.blockNumber);

  for (const event of events) {
    expect(event.args.orderID, "DeleteOrder event trigger ID is wrong").eq(
      String(orderID)
    );
  }

  expect(
    events.length,
    name + "The number of event triggers is wrong"
  ).to.be.equal(num);
}

async function vaildFundUsed({ market, targetAmount }) {
  let amount = await getMarketFundsUsed(market);
  targetAmount = numberToBigNumber(targetAmount);

  expect(targetAmount, "market fundUsed amount  error").to.be.eq(amount);
}

async function validFeeVaultReceive({
  tokenContract,
  blockNumber,
  from,
  to,
  amount,
  expandDecimals = true,
}) {
  await validTransfer({
    tokenContract: tokenContract,
    blockNumber: blockNumber,
    from: from,
    to: to,
    amount: amount,
    label: "The fee vault transfer amount is incorrect",
    name: "",
    expandDecimals: expandDecimals,
  });
}

async function validTransfer({
  tokenContract,
  blockNumber,
  from,
  to,
  amount,
  label = "",
  expandDecimals = true,
} = {}) {
  const name = "Transfer";

  let tokenDecimals = await tokenContract.decimals();

  const events = await tokenContract.queryFilter(name, blockNumber);
  if (!BN.isBigNumber(amount)) {
    amount = formatFloat(amount, tokenDecimals);
  }

  let tmp;
  if (expandDecimals) {
    tmp = ethers.utils.parseUnits(String(amount), tokenDecimals);
  } else {
    tmp = amount;
  }
  let found = 0;
  let found0 = false;
  for (const event of events) {
    if (event.args.to == to && event.args.from == from) {
      found0 = true;
      let eventAmount =
        expandDecimals == false
          ? amount
          : ethers.utils.parseUnits(amount + "", tokenDecimals);

      console.log(
        "test case" +
          label +
          "The actual amount received by the target contract is",
        event.args.value,
        " | expect Expected amount received",
        eventAmount,
        event.args.value.eq(eventAmount) ? "pass" : "checkfail"
      );
      let reason = event.args.value.eq(eventAmount)
        ? " checkpass "
        : " checkfail ";
      logger.info(
        "test case" +
          label +
          " The actual amount received by the target contract is " +
          event.args.value.toString() +
          " | expect Expected amount received " +
          eventAmount.toString() +
          reason
      );

      if (
        areStringsEqualIgnoringLastTwoChars(
          String(tmp),
          String(event.args.value)
        ) ||
        allowErrorRange(tmp, event.args.value)
      ) {
        return;
      }
      found = event.args.value;
    }
  }
  if (found0) {
    expect(String(tmp), label + "failed").eq(String(found));
    expect(
      areStringsEqualIgnoringLastTwoChars(String(tmp), String(found)),
      label + "failed"
    ).eq(true);
  } else {
    expect(true, "No transfer record found").eq(false);
  }
}
//order create exist info marketfunds
//order update  price
//order delete exist status  user  1.add order funds delete orderID
//   2.remove order delete orderID
// -funds -orderid delete
//system 1.exec 2.invaild order
async function vaildOrderExist({ user, orderID, label } = {}) {
  let orderKey = getOrderKey(user, orderID);
  let exist = await containsKey(orderKey, label);

  expect(exist, "The order should already exist").to.eq(true);
  logger.info("test case");
}

async function vaildOrderCollateral({ user, orderID, label, collD }) {
  let order = await getOrderInfo({
    user,
    orderID,
    label,
  });
  expect(order.collateral, "test case").eq(collD);
}

async function vaildOrdersExist({ user, orderIDs, label } = {}) {
  for (let index = 0; index < orderIDs.length; index++) {
    let orderKey = getOrderKey(user, orderIDs[index]);
    let exist = await containsKey(orderKey, label);
    expect(exist, "The order should already exist").to.eq(true);
  }
}

function formatFloat(num, decimals = 6) {
  if (false == isFloat(num)) {
    return num;
  }
  return parseFloat(num.toFixed(decimals));
}

function isFloat(n) {
  return Number(n) === n && n % 1 !== 0;
}

function areStringsEqualIgnoringLastTwoChars(str1, str2) {
  return str1.slice(0, -2) === str2.slice(0, -2);
}

function validBalanceChange(source, target, label) {
  let result = target.eq(source) ? " check pass " : " check fail ";
  logger.info(
    label +
      " change in expected value " +
      source.toString() +
      " actual change " +
      target.toString() +
      result
  );

  console.log(
    label + "change in expected value",
    source,
    "actual change",
    target,
    target.eq(source) ? "pass" : "checkfail"
  );
  expect(source, label + "").to.eq(target);
}

function allowErrorRange(source, target) {
  return (
    source.gt(target.sub(ERROR_ALLOW)) && source.lt(target.add(ERROR_ALLOW))
  );
}

async function validOrderDeleted({ user, orderID, label }) {
  expect(orderID, "Order ID cannot be 0").not.eq(0);
  let orderKey = getOrderKey(user, orderID);
  let exists = await containsKey(orderKey, label);
  expect(exists, "The order should be deleted").eq(false);
  logger.info("order ID" + orderID.toString() + "been deleted");
}

async function vaildUpdatePositionEvent({ contract, tx, args }) {
  const name = "UpdatePosition";
  const events = await contract.queryFilter(name, tx.blockNumber);
  for (const event of events) {
    expect(
      event.args.account,
      "UpdatePositionevent emit. account  params error"
    ).eq(args[0]);
    expect(
      event.args.collateralDelta,
      "UpdatePositionevent emit. collateralDelta  params error"
    ).eq(args[1]);
    expect(
      event.args.collateralDeltaAfter,
      "UpdatePositionevent emit. collateralDeltaAfter  params error"
    ).eq(args[2]);
    expect(
      event.args.sizeDelta,
      "UpdatePositionevent emit. sizeDelta  params error"
    ).eq(args[3]);
    expect(
      event.args.isLong,
      "UpdatePositionevent emit. isLong  params error"
    ).eq(args[4]);
    expect(
      event.args.price,
      "UpdatePositionevent emit. price  params error"
    ).eq(args[5]);
    expect(event.args.pnl, "UpdatePositionevent emit. pnl  params error").eq(
      args[6]
    );
    // expect(event.args.fees,"UpdatePositionevent emit. fees  params error").eq(args[7])
    expect(
      event.args.market,
      "UpdatePositionevent emit. market  params error"
    ).eq(args[8]);
    expect(
      event.args.collateralToken,
      "UpdatePositionevent emit. collateralToken  params error"
    ).eq(args[9]);
    expect(
      event.args.indexToken,
      "UpdatePositionevent emit. indexToken  params error"
    ).eq(args[10]);
    expect(
      event.args.category,
      "UpdatePositionevent emit. category  params error"
    ).eq(args[11]);
    expect(
      event.args.fromOrder,
      "UpdatePositionevent emit. fromOrder  params error"
    ).eq(args[12]);
  }
}

module.exports = {
  vaildEvent,
  validOrderDeleted,
  validFeeVaultReceive,
  vaildOrderExist,
  validCollateral,
  validSize,
  validBalanceChange,
  formatFloat,
  validPnl,
  validTransfer,
  validFundFee,
  validAvgPrice,
  vaildUpdatePositionEvent,
  vaildFundUsed,
  vaildOrdersExist,
  validOrdersDeleted,
  vaildOrderCollateral,
  checkCollateral,
};
