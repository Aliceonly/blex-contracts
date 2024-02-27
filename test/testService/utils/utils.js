const { BigNumber: BN } = require("ethers");
const { ethers, waffle } = require("hardhat");
const { getPosition } = require("../../../scripts/position/positionBook");
const {
  containsKey,
  getOrderByKey,
} = require("../../../scripts/order/orderStore");
const { getFundingFeeReader } = require("../../../scripts/market/marketReader");
const { getMaxSlippage } = require("./getConfData");

const fs = require("fs");

const winston = require("winston");
const { default: Ethers } = require("@typechain/ethers-v5");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: "logger.info",
    }),
    new winston.transports.File({
      filename: "errors.log",
      level: "error",
    }),
  ],
});

const COLLATERAL_TOKEN_DECIMAL = 18;
const FEE_RATE_PRECISION = 100000000;

const DENOMINATOR_SLIPPAGE = 10000;

const usdDecimals = 18;

function addDecimals(num, decimals) {
  num = String(num);
  const zeros = ethers.utils.parseUnits("1", decimals); //_price
  if (num.indexOf(".") < 0) {
    return BN.from(num).mul(zeros);
  }
  const [left, right, ...rest] = num.split(".");
  const num1 = BN.from(left).mul(zeros);
  const right_de = decimals - right?.length;
  const zeros2 = ethers.utils.parseUnits("1", right_de);
  const num2 = BN.from(right).mul(zeros2);
  return num1.add(num2);
}

async function getCurrentPosition({ user, price, isLong = true }) {
  let p = addDecimals(String(price), 30);
  return await getPosition(user, p, isLong);
}
async function getSize({ user, price, isLong = true }) {
  let position = await getCurrentPosition({
    user: user,
    price: price,
    isLong: isLong,
  });
  if (position == null) {
    return 0;
  }
  return position["size"];
}
async function advancesBlock() {
  let provider = waffle.provider;
  let blockNumber0 = await provider.getBlockNumber();
  await provider.send("evm_mine", []);
  const blockNumber1 = await provider.getBlockNumber();
  // console.log(blockNumber0, blockNumber1);
}
async function getCurrentBlockTimeStamp() {
  const provider = waffle.provider; // ethers.provider
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);
  return block.timestamp;
}
async function advanceTimeStamp(ts) {
  const previousTS = await getCurrentBlockTimeStamp();
  const provider = waffle.provider; // ethers.provider
  await provider.send("evm_setNextBlockTimestamp", [previousTS + ts]);
  await provider.send("evm_mine");
  await getCurrentBlockTimeStamp();
}
async function advanceOneDay() {
  await advanceTimeStamp(86400);
}

function formatFloat(num, decimals = 6) {
  if (false == isFloat(num)) {
    return num;
  }
  return parseFloat(num.toFixed(decimals));
}

async function getFundFee({ user, market, isLong = true }) {
  const ff = await getFundingFeeReader(user, market, isLong);
  return ff;
}

function numberToBigNumber(num) {
  return ethers.utils.parseUnits(num + "", COLLATERAL_TOKEN_DECIMAL);
}

function priceToBigNumber(price) {
  return ethers.utils.parseUnits(price + "", 30);
}

function getOrderKey(account, orderID) {
  let hash = ethers.utils.solidityKeccak256(
    ["address", "uint64"],
    [account, orderID]
  );
  return hash;
}

async function getOrderInfo({ user, orderID, label }) {
  let orderKey = getOrderKey(user, orderID);

  let order = await getOrderByKey(orderKey, label);

  return order;
}

async function getPNL({ user, price, isLong = true }) {
  let position = await getCurrentPosition({
    user: user,
    price: price,
    isLong: isLong,
  });

  if (position == null) {
    return 0;
  }
  return position["realisedPnl"];
}
async function getCollateral({ user, price, isLong = true }) {
  let position = await getCurrentPosition({
    user: user,
    price: price,
    isLong: isLong,
  });

  if (position == null) {
    return 0;
  }
  return position["collateral"];
}

function calcOpenFee({ sizeDelta }) {
  return getFee({
    sizeDelta: sizeDelta,
  });
}

function calcCloseFee({ sizeDelta }) {
  return getFee({
    sizeDelta: sizeDelta,
  });
}

//Calculate slippage
function calcSlippagePrice({ price, isLong, isOpen, slippage }) {
  if (slippage > getMaxSlippage()) {
    slippage = getMaxSlippage();
  }
  let slippagePrice;
  if (isLong == isOpen) {
    slippagePrice = price.add(price.mul(slippage).div(DENOMINATOR_SLIPPAGE));
  } else {
    slippagePrice = price.sub(price.mul(slippage).div(DENOMINATOR_SLIPPAGE));
  }
  return slippagePrice;
}

///calc pnl
function calcPNL({ position, price }) {
  price = ethers.utils.parseUnits(price + "", 30);

  let priceDelta = position.averagePrice.gt(price)
    ? position.averagePrice.sub(price)
    : price.sub(position.averagePrice);

  let pnl = position.size.mul(priceDelta).div(position.averagePrice);

  let hasProfit;
  if (position.isLong) {
    hasProfit = price.gt(position.averagePrice);
  } else {
    hasProfit = position.averagePrice.gt(price);
  }

  return {
    hasProfit: hasProfit,
    pnl: pnl,
  };
}

function calAveragePrice({ position, sizeDelta, marketPrice, pnl, hasProfit }) {
  let size = position.size.add(sizeDelta);
  let netSize;
  if (position.isLong) {
    netSize = hasProfit ? size.add(pnl) : size.sub(pnl);
  } else {
    netSize = hasProfit ? size.sub(pnl) : size.add(pnl);
  }
  return marketPrice.mul(size).div(netSize);
}

function calcMarketAmount({ amount, fee }) {
  return amount.sub(fee);
}

function calcCollateral({ pay, fees }) {
  return pay.sub(fees);
}

function totalFees(fees) {
  let total = BN.from(0);
  for (let i = 0; i < fees.length; i++) {
    if (fees[i].eq(0)) continue;
    total = total.add(fees[i]);
  }
  return total;
}

function getCollateralTokenDecimal() {
  return COLLATERAL_TOKEN_DECIMAL;
}

function getFee({ sizeDelta }) {
  if (sizeDelta.eq(0)) {
    return BN.from(0);
  }
  let point = 100000;
  let size = sizeDelta.mul(FEE_RATE_PRECISION - point).div(FEE_RATE_PRECISION);

  return sizeDelta.sub(size);
}

/*
    order
*/

function getTriggerAbove({ order }) {
  if (order.triggerAbove == 1) {
    return true;
  }
  if (order.triggerAbove == 2) {
    return false;
  }
  throw new Error("invalid order trigger above");
}

function isMarkPriceValid({ order, marketPrice }) {
  if (getTriggerAbove(order)) {
    return marketPrice.ge(order.price);
  } else {
    marketPrice.le(order.price);
  }
}

function getFromOrder({ order }) {
  return order.extra0;
}

function getStoploss({ order }) {
  return order.extra0;
}

function getTakeprofit({ order }) {
  return order.extra1;
}

function getIsKeepLev({ order }) {
  return order.extra3 > 0;
}

function validTPSL({ order, isLong = true }) {
  if (getTakeprofit({ order }).gt(0)) {
    if (!(getTakeprofit({ order }).gt(order.price) == isLong)) {
      throw new Error("OrderBook:tp<price");
    }
  }

  if (getStoploss({ order }).gt(0)) {
    if (!(order.price.gt(getStoploss(order)) == isLong)) {
      throw new Error("OrderBook:sl>price");
    }
  }
}

function validOrderAccountAndID({ order }) {
  if (order.account == ethers.constants.AddressZero) {
    throw new Error("invalid order key");
  }
  if (order.orderID == 0) {
    throw new Error("invalid order key");
  }
}

function parseVaultAsset({ amount, originDigits }) {
  return amount
    .mul(BN.from(10).pow(usdDecimals))
    .div(BN.from(10).pow(originDigits));
  //return (amount * 10 ** 18) / 10 ** originDigits;
}

function calcAUM(globalPNL, usdBalance) {
  let aum = BN.from(0);
  if (globalPNL.gt(0)) {
    aum = usdBalance.sub(globalPNL);
  } else {
    aum = usdBalance.add(globalPNL.mul(-1));
  }
  return aum;
}

// function getFundingFee({
//     size,
//     entryFundingRate,
//     _cumRates,
// }){
//     return (getInternalFundingFee({
//         size: size,
//         entryFundingRate: entryFundingRate,
//         cumRates: _cumRates
//     })).div(FEE_RATE_PRECISION)
// }

// function getInternalFundingFee({
//     size,
//     entryFundingRate,
//     cumRates
// }){
//     let rate=cumRates.sub(entryFundingRate)
//     if( rate.eq(0)){
//         return  0
//     }
//     return size.mul(rate)
// }

module.exports = {
  getCurrentPosition,
  getSize,
  addDecimals,
  advancesBlock,
  advanceOneDay,
  getFundFee,
  totalFees,
  getPNL,
  getCollateral,
  numberToBigNumber,
  priceToBigNumber,
  getOrderKey,
  getOrderInfo,
  getCurrentBlockTimeStamp,
  calcOpenFee,
  calcCloseFee,
  calcPNL,
  getCollateralTokenDecimal,
  calcMarketAmount,
  calcCollateral,
  calAveragePrice,
  calcSlippagePrice,
  parseVaultAsset,
  calcAUM,
  advanceTimeStamp,
  logger: logger,
};
