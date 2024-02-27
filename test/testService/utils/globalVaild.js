const { BigNumber } = require("ethers");
const { buildGlobalVaildParams } = require("./buildParams");
const {
  getGlobalSize,
  getAccountSize,
} = require("../../../scripts/market/marketRouter");
const { getMarketSizes } = require("../../../scripts/position/positionBook");
const { parseVaultAsset } = require("./utils");
const { getAUM } = require("../../../scripts/vault/vaultRouter");
const { ethers } = require("hardhat");
const {
  getMaxMarketSizeLimit,
  getMaxUserNetSizeLimit,
  getMaxNetSizeLimit,
  getMaxSizeLimit,
} = require("../../../scripts/market/globalValid");

const BASIS_POINTS_DIVISOR = BigNumber.from(10000);

async function validateIncreasePosition({ _inputs, user, collateralToken }) {
  let globalSizes = await getGlobalSize();
  // let accountSize = await getAccountSize(_inputs._order.account);
  let accountSizes = await getAccountSize(user);
  let marketSizes = await getMarketSizes();
  let aum = await getAUM();
  // let contract = new ethers.Contract(collateralToken, []);
  let _collateralDecimals = 18;
  console.log("aum", aum);
  aum = parseVaultAsset({
    amount: aum,
    originDigits: _collateralDecimals,
  });
  console.log("aum", aum);
  let globalVaildData = buildGlobalVaildParams({
    market: _inputs._market,
    sizeDelta: _inputs._sizeDelta,
    isLong: _inputs._isLong,
    globalLongSizes: globalSizes[0],
    globalShortSizes: globalSizes[1],
    marketLongSizes: marketSizes[0],
    marketShortSizes: marketSizes[1],
    userLongSizes: accountSizes[0],
    userShortSizes: accountSizes[1],
    aum,
  });
  if (!(await isIncreasePosition({ params: globalVaildData }))) {
    throw new Error("mr:gv validateIncreasePosition");
  }
}

async function getBuildGlobalParams({
  market,
  user,
  collateralToken,
  isLong = true,
  sizeDelta = BigNumber.from(0),
}) {
  let globalSizes = await getGlobalSize();
  // let accountSize = await getAccountSize(_inputs._order.account);
  let accountSizes = await getAccountSize(user);
  let marketSizes = await getMarketSizes();
  let aum = await getAUM();
  // let contract = new ethers.Contract(collateralToken, []);
  let _collateralDecimals = 18;
  aum = parseVaultAsset({
    amount: aum,
    originDigits: _collateralDecimals,
  });

  let globalVaildData = buildGlobalVaildParams({
    market,
    sizeDelta,
    isLong,
    globalLongSizes: globalSizes[0],
    globalShortSizes: globalSizes[1],
    marketLongSizes: marketSizes[0],
    marketShortSizes: marketSizes[1],
    userLongSizes: accountSizes[0],
    userShortSizes: accountSizes[1],
    aum,
  });
  return globalVaildData;
}

async function isIncreasePosition({ params }) {
  if (params.sizeDelta.eq(0)) {
    return true;
  }
  let _max = await _getMaxIncreasePositionSize({
    params,
  });

  return _max.gte(params.sizeDelta);
}

async function getMaxIncreasePositionSize({ params }) {
  return await _getMaxIncreasePositionSize({ params });
}

async function _getMaxIncreasePositionSize({ params }) {
  let _min = await getMaxUseableGlobalSize({
    longSize: params.globalLongSizes,
    shortSize: params.globalShortSizes,
    aum: params.aum,
    isLong: params.isLong,
  });
  if (_min.eq(0)) {
    return BigNumber.from(0);
  }

  let _tmp = await getMaxUseableNetSize({
    longSize: params.globalLongSizes,
    shortSize: params.globalShortSizes,
    aum: params.aum,
    isLong: params.isLong,
  });
  if (_tmp.eq(0)) {
    return BigNumber.from(0);
  }
  if (_tmp.lt(_min)) {
    _min = _tmp;
  }

  _tmp = await getMaxUseableUserNetSize({
    longSize: params.userLongSizes,
    shortSize: params.userShortSizes,
    aum: params.aum,
    isLong: params.isLong,
  });

  if (_tmp.eq(0)) {
    return BigNumber.from(0);
  }
  if (_tmp.lt(_min)) {
    _min = _tmp;
  }

  _tmp = await getMaxUseableMarketSize({
    market: params.market,
    isLong: params.isLong,
    longSize: params.marketLongSizes,
    shortSize: params.marketShortSizes,
  });
  if (_tmp.lt(_min)) {
    _min = _tmp;
  }
  return _min;
}

async function getMaxUseableGlobalSize({ longSize, shortSize, aum, isLong }) {
  let maxSizeLimit = await getMaxSizeLimit();
  let _size = isLong ? longSize : shortSize;

  let _limit = aum.mul(maxSizeLimit).div(BASIS_POINTS_DIVISOR);

  if (_size.gt(_limit)) {
    return BigNumber.from(0);
  }
  console.log("getMaxUseableGlobalSize", _limit.sub(_size));
  return _limit.sub(_size);
}

async function getMaxUseableNetSize({ longSize, shortSize, aum, isLong }) {
  let maxNetSizeLimit = await getMaxNetSizeLimit();
  let _size = isLong ? longSize : shortSize;
  let _limit = aum.mul(maxNetSizeLimit).div(BASIS_POINTS_DIVISOR);
  _limit = isLong ? _limit.add(shortSize) : _limit.add(longSize);
  if (_size.gte(_limit)) {
    return BigNumber.from(0);
  }
  console.log("getMaxUseableNetSize", _limit.sub(_size));
  return _limit.sub(_size);
}

async function getMaxUseableUserNetSize({ longSize, shortSize, aum, isLong }) {
  let maxUserNetSizeLimit = await getMaxUserNetSizeLimit();
  let _size = isLong ? longSize : shortSize;
  let _limit = aum.mul(maxUserNetSizeLimit).div(BASIS_POINTS_DIVISOR);
  _limit = isLong ? _limit.add(shortSize) : _limit.add(longSize);
  if (_size.gte(_limit)) {
    return BigNumber.from(0);
  }
  console.log("getMaxUseableUserNetSize", _limit.sub(_size));
  return _limit.sub(_size);
}

async function getMaxUseableMarketSize({
  market,
  isLong,
  longSize,
  shortSize,
}) {
  let _limit = await getMaxMarketSizeLimit(market);
  let _size = isLong ? longSize : shortSize;
  console.log("getMaxUseableMarketSize", _limit.sub(_size), _limit);
  if (_size.gte(_limit)) {
    return BigNumber.from(0);
  }
  console.log("getMaxUseableMarketSize", _limit.sub(_size));
  return _limit.sub(_size);
}

module.exports = {
  getMaxIncreasePositionSize,
  isIncreasePosition,
  validateIncreasePosition,
  getMaxUseableMarketSize,
  getMaxUseableUserNetSize,
  getMaxUseableNetSize,
  getMaxUseableGlobalSize,
  getBuildGlobalParams,
};
