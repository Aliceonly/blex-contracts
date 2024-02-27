const { ethers } = require("hardhat");

const { addDecimals } = require("./utils");
const { BigNumber } = require("ethers");
const COLLATERAL_TOKEN_DECIMAL = 18;

function buildIncreaseOrderParam({
  market,
  price,
  pay = 20,
  size = 200,
  tp = 0,
  sl = 0,
  isLong = true,
  fromMarket = 1,
}) {
  return {
    _market: market,
    _isLong: isLong,
    _oraclePrice: "0",
    isOpen: true,
    isCreate: true,
    _order: {
      version: "0",
      updatedAtBlock: "0",
      triggerAbove: "0",
      account: ethers.constants.AddressZero,
      extra3: "0",
      collateral: ethers.utils.parseUnits(pay + "", COLLATERAL_TOKEN_DECIMAL), //pay
      size: ethers.utils.parseUnits(size + "", COLLATERAL_TOKEN_DECIMAL),
      price: addDecimals(String(price), 30),
      extra1: addDecimals(String(tp), 30),
      orderID: "0",
      extra2: "0",
      extra0: addDecimals(String(sl), 30),
      refCode: ethers.utils.formatBytes32String(""),
    },
    inputs: [
      ethers.utils.parseUnits(String(pay), COLLATERAL_TOKEN_DECIMAL),
      fromMarket,
      30,
    ],
  };
}

function buildFees({
  openFee = BigNumber.from(0),
  closeFee = BigNumber.from(0),
  fundFee = BigNumber.from(0),
  execFee = BigNumber.from(0),
  liqFee = BigNumber.from(0),
  buyLpFee = BigNumber.from(0),
  sellLpFee = BigNumber.from(0),
  extraFee0 = BigNumber.from(0),
  extraFee1 = BigNumber.from(0),
  extraFee2 = BigNumber.from(0),
  extraFee3 = BigNumber.from(0),
  extraFee4 = BigNumber.from(0),
  counter = BigNumber.from(0),
}) {
  return [
    openFee,
    closeFee,
    fundFee,
    execFee,
    liqFee,
    buyLpFee,
    sellLpFee,
    extraFee0,
    extraFee1,
    extraFee2,
    extraFee3,
    extraFee4,
    counter,
  ];
}

// function buildFees(closeFee,liqFee){
//     return [
//         BigNumber.from(0),
//         closeFee,
//         BigNumber.from(0),
//         BigNumber.from(0),
//         liqFee,
//         BigNumber.from(0)
//     ]
// }

function buildIncreasePositionParam({
  market,
  price,
  tp = 0,
  sl = 0,
  pay = 20,
  size = 200,
  isLong = true,
}) {
  return {
    _market: market,
    _isLong: isLong,
    _oraclePrice: 0,
    isOpen: true,
    _account: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    _sizeDelta: ethers.utils.parseUnits(size + "", COLLATERAL_TOKEN_DECIMAL),
    _price: addDecimals(String(price), 30),
    _slippage: 30,
    _isExec: false,
    liqState: 0,
    _fromOrder: 0,
    _refCode: ethers.utils.formatBytes32String(""), //todo
    collateralDelta: ethers.utils.parseUnits(
      pay + "",
      COLLATERAL_TOKEN_DECIMAL
    ),
    execNum: 0,
    inputs: [
      ethers.utils.parseUnits(String(tp), 30), //tp
      ethers.utils.parseUnits(String(sl), 30), //sl
    ],
  };
}

function buildDecreaseOrderParam({
  market,
  price,
  isKeepLev = true,
  size = 200,
  isLong = true,
}) {
  return {
    _market: market,
    _isLong: isLong,
    _oraclePrice: "0",
    isOpen: false,
    isCreate: true,
    _order: {
      version: "0",
      updatedAtBlock: "0",
      triggerAbove: "0",
      account: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      extra3: isKeepLev ? "1" : "0",
      collateral: "0",
      size: ethers.utils.parseUnits(size + "", COLLATERAL_TOKEN_DECIMAL),
      price: addDecimals(String(price), 30),
      extra1: "0",
      orderID: "0",
      extra2: "0",
      extra0: "0",
      refCode: ethers.utils.formatBytes32String(""),
    },
    inputs: [],
  };
}

function buildDecreasePositionParam({
  market,
  price,
  isKeepLev = true,
  size = 0,
  isLong = true,
  collateralDelta = 0,
}) {
  return {
    _market: market,
    _isLong: isLong,
    _oraclePrice: "0",
    isOpen: false,
    _account: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    _sizeDelta: ethers.utils.parseUnits(size + "", COLLATERAL_TOKEN_DECIMAL),
    _price: addDecimals(String(price), 30),
    _slippage: "30",
    _isExec: false,
    liqState: "0",
    _fromOrder: "0",
    _refCode: ethers.utils.formatBytes32String(""), //todo
    collateralDelta: ethers.utils.parseUnits(
      collateralDelta + "",
      COLLATERAL_TOKEN_DECIMAL
    ),
    execNum: "0",
    inputs: [isKeepLev ? "1" : "0"],
  };
}

function buildUpdateOrderParams({ market, order, isLong, isIncrease }) {
  let ip;
  if (isIncrease) {
    ip = [order.extra1, order.extra0];
  } else {
    ip = [order.extra3];
  }
  return {
    _market: market,
    _isLong: isLong,
    _oraclePrice: "0",
    isOpen: isIncrease,
    _account: order.account,
    _sizeDelta: order.size,
    _price: order.price,
    _slippage: "0",
    _isExec: true,
    liqState: "0",
    _fromOrder: order.orderID,
    _refCode: order.refCode,
    collateralDelta: order.collateral,
    execNum: "0",
    inputs: ip,
  };
}

function buildExecOrder({ market, order, isLong, isIncrease }) {
  let ip;
  if (isIncrease) {
    ip = [order.extra1, order.extra0];
  } else {
    ip = [order.extra3];
  }
  return {
    _market: market,
    _isLong: isLong,
    _oraclePrice: "0",
    isOpen: isIncrease,
    _account: order.account,
    _sizeDelta: order.size,
    _price: order.price,
    _slippage: "0",
    _isExec: true,
    liqState: "0",
    _fromOrder: order.orderID,
    _refCode: order.refCode,
    collateralDelta: order.collateral,
    execNum: "0",
    inputs: ip,
  };
}

function buildGlobalVaildParams({
  market,
  sizeDelta,
  isLong,
  globalLongSizes,
  globalShortSizes,
  userLongSizes,
  userShortSizes,
  marketLongSizes,
  marketShortSizes,
  aum,
}) {
  return {
    market,
    sizeDelta,
    isLong,
    globalLongSizes,
    globalShortSizes,
    userLongSizes,
    userShortSizes,
    marketLongSizes,
    marketShortSizes,
    aum,
  };
}

function buildCreateInputsParams({
  _name, //1
  _marketAddress, //2
  addrs,
  _openStoreLong, //11
  _closeStoreLong, //12
  _openStoreShort, //13
  _closeStoreShort, //14
  _minSlippage,
  _maxSlippage,
  _minLeverage,
  _maxLeverage,
  _maxTradeAmount,
  _minPay,
  _minCollateral,
  _allowOpen,
  _allowClose,
  _tokenDigits,
}) {
  return {
    _name, //1
    _marketAddress, //2
    addrs,
    _openStoreLong, //11
    _closeStoreLong, //12
    _openStoreShort, //13
    _closeStoreShort, //14
    _minSlippage,
    _maxSlippage,
    _minLeverage,
    _maxLeverage,
    _maxTradeAmount,
    _minPay,
    _minCollateral,
    _allowOpen,
    _allowClose,
    _tokenDigits,
  };
}

module.exports = {
  buildIncreasePositionParam,
  buildDecreasePositionParam,
  buildIncreaseOrderParam,
  buildDecreaseOrderParam,
  buildUpdateOrderParams,
  buildExecOrder,
  buildFees,
  buildGlobalVaildParams,
  buildCreateInputsParams,
};
