const { expect } = require("chai");
const { balanceOf, decimals } = require("../../../scripts/mock/erc20");
const { userMintAndApprove } = require("../deploy/deployAllContract");
const {
  buildIncreasePositionParam,
  buildIncreaseOrderParam,
  buildDecreasePositionParam,
  buildDecreaseOrderParam,
  buildExecOrder,
} = require("./buildParams");
const {
  connectIncreasePosition,
  setIsEnableMarketConvertToOrder,
  connectUpdateOrder,
  connectDecreasePosition,
  increasePosition: inc,
} = require("../../../scripts/market/marketRouter");
const { ethers } = require("hardhat");
const { getSize, advancesBlock } = require("./utils");
const { BigNumber: BN } = require("ethers");
const { vaildEvent } = require("./vaildData");
const { setPrice } = require("../../../scripts/mock/oracle");
const { grantRoleIfNotGranted } = require("../../../scripts/utils/helpers");
const { execOrderKey } = require("../../../scripts/market/market");

const COLLATERAL_TOKEN_DECIMAL = 18;

async function increasePosition({
  user,
  approver,
  market,
  price,
  tp = 0,
  sl = 0,
  pay = 20,
  size = 200,
  isLong = true,
  isRevert = false,
}) {
  await userMintAndApprove(user, pay, approver);
  let beforeAmount = await balanceOf(user.address);
  let beforeSize = await getSize({
    user: user.address,
    price: price,
    isLong: isLong,
  });
  let inputs = buildIncreasePositionParam({
    market: market,
    price: price,
    tp: tp,
    sl: sl,
    pay: pay,
    size: size,
    isLong: isLong,
  });

  if (isRevert) {
    return await expect(
      connectIncreasePosition(user, inputs),
      "close a position not revert"
    ).to.be.rejected;
  }
  let tx = await connectIncreasePosition(user, inputs);

  let rp = await tx.wait();
  let afterSize = await getSize({
    user: user.address,
    price: price,
    isLong: isLong,
  });
  expect(
    inputs._sizeDelta,
    " The increased size after Open Position is wrong"
  ).eq(BN.from(afterSize).sub(beforeSize));
  let afterAmount = await balanceOf(user.address);
  expect(
    beforeAmount.sub(afterAmount),
    "Open Position user failed to deduct paycheck"
  ).eq(ethers.utils.parseUnits(pay + "", await decimals()));
  let balanceChange = afterAmount.sub(beforeAmount);

  return {
    lastTx: tx,
    lastReceipt: rp,
    balanceChange: balanceChange,
  };
}

async function increaseCollateral({ pay, market }) {
  let params = buildIncreasePositionParam({
    market: market,
    pay: pay,
    price: 0,
    size: 0,
  });

  return await inc(params);
}

async function increaseLimit({
  user,
  approver,
  market,
  price,
  tp = 0,
  sl = 0,
  pay = 20,
  size = 200,
  isLong = true,
}) {
  await userMintAndApprove(user, pay, approver);
  let beforeAmount = await balanceOf(user.address);
  let inputs = buildIncreaseOrderParam({
    market: market,
    price: price,
    size: size,
    isLong: isLong,
    tp: tp,
    sl: sl,
  });

  let lastTx = await connectUpdateOrder(user, inputs);
  let lastReceipt = await lastTx.wait();
  let afterAmount = await balanceOf(user.address);

  expect(
    beforeAmount.sub(afterAmount),
    "Open Position user failed to deduct paycheck"
  ).eq(ethers.utils.parseUnits(pay + "", await decimals()));
  return {
    lastTx: lastTx,
    lastReceipt: lastReceipt,
  };
}

async function decreaseLimit({
  user,
  market,
  price,
  size = 200,
  isLong = true,
  isKeepLev = true,
  isRevert = false,
}) {
  let inputs = buildDecreaseOrderParam({
    market: market,
    price: price,
    isKeepLev: isKeepLev,
    size: size,
    isLong: isLong,
  });

  if (isRevert) {
    return await expect(
      connectUpdateOrder(user, inputs),
      "Place a close a position order without revert"
    ).to.be.reverted;
  }

  let tx = await connectUpdateOrder(user, inputs);
  return {
    lastTx: tx,
  };
}

async function decreasePosition({
  user,
  market,
  price,
  size,
  isLong = true,
  isKeepLev = true,
  collateralDelta = 0,
}) {
  await advancesBlock();
  let beforeAmount = await balanceOf(user.address);
  let beforeSize = await getSize({
    user: user.address,
    price: price,
    isLong: isLong,
  });

  let inputs = buildDecreasePositionParam({
    market: market,
    price: price,
    size: size,
    isLong: isLong,
    isKeepLev: isKeepLev,
    collateralDelta: collateralDelta,
  });
  let tx = await connectDecreasePosition(user, inputs);
  let lastReceipt = await tx.wait();
  let atferAmount = await balanceOf(user.address);
  let afterSize = await getSize({
    user: user.address,
    price: price,
    isLong: isLong,
  });
  let balanceChange = atferAmount.sub(beforeAmount);
  expect(
    ethers.utils.parseUnits(String(size), COLLATERAL_TOKEN_DECIMAL),
    "The size of the lighten up is wrong"
  ).eq(beforeSize.sub(afterSize));

  return {
    lastTx: tx,
    lastReceipt: lastReceipt,
    balanceChange: balanceChange,
  };
}

async function buildExecOrderKey({ market, order, isLong, isIncrease }) {
  let updateOrderParams = buildExecOrder({
    market: market,
    order: order,
    isLong: isLong,
    isIncrease: isIncrease,
  });

  await execOrderKey(order, updateOrderParams);
}

async function execPrePare({ user, amount, marketRouter, indexToken, price }) {
  await setIsEnableMarketConvertToOrder(false);
  await setPrice(indexToken, price);
  await userMintAndApprove(user, amount, marketRouter);
}

async function decreaseCollateral({ user, market, collateralDelta }) {
  let params = buildDecreasePositionParam({
    market: market,
    collateralDelta: collateralDelta,
    price: 0,
    size: 0,
  });
  return await connectDecreasePosition(user, params);
}

module.exports = {
  increasePosition,
  increaseLimit,
  decreaseLimit,
  decreasePosition,
  buildExecOrderKey,
  increaseCollateral,
  execPrePare,
  decreaseCollateral,
};
