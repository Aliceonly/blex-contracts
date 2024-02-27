const { BigNumber } = require("ethers");

const FEE_RATE_PRECISION = 100000000;
const MIN_FUNDING_INTERVAL = 3600;
const minRateLimit = 2083;
const DEFAILT_RATE_DIVISOR = 100;
const BASIS_INTERVAL_HOU = 24;

function getNextFundingRate({ lastTime, nowTime, longRate, shortRate }) {
  let fundingInterval = MIN_FUNDING_INTERVAL;

  if (lastTime + fundingInterval > nowTime) {
    return {
      longRates: 0,
      shortRates: 0,
    };
  }

  let intervals = (nowTime - lastTime) / fundingInterval;

  let longRates = longRate * intervals;
  let shortRates = shortRate * intervals;

  return {
    longRates: longRates,
    shortRates: shortRates,
  };
}

function getFundingRate({ longSize, shortSize }) {
  let lRate = calFeeRate({
    longSize,
    shortSize,
  });
  let sRate = lRate;
  if (lRate == minRateLimit) {
    return {
      lRate: lRate,
      sRate: sRate,
    };
  }

  if (longSize >= shortSize) {
    return {
      lRate: lRate,
      sRate: 0,
    };
  }

  return {
    lRate: 0,
    sRate: sRate,
  };
}

function calFeeRate({ longSize, shortSize }) {
  if (longSize == 0 && shortSize == 0) {
    return minRateLimit;
  }

  let size;

  if (longSize >= shortSize) {
    size = longSize - shortSize;
  } else {
    size = shortSize - longSize;
  }
  let rate;

  if (size != 0) {
    let divisor = longSize + shortSize;
    rate = (size * FEE_RATE_PRECISION) / divisor;
    rate =
      (rate * rate) /
      FEE_RATE_PRECISION /
      DEFAILT_RATE_DIVISOR /
      BASIS_INTERVAL_HOU;
  }

  if (rate < minRateLimit) {
    return minRateLimit;
  }

  return rate;
}

function getFundingFee({ size, entryFundingRate, cumRates }) {
  let rateResult = getInternalFundingFee({
    size: size,
    entryFundingRate: entryFundingRate,
    cumRates: cumRates,
  });

  return rateResult.div(FEE_RATE_PRECISION);
}

function getInternalFundingFee({ size, entryFundingRate, cumRates }) {
  let rate = cumRates.sub(entryFundingRate);
  if (rate.eq(0)) {
    return BigNumber.from(0);
  }
  return size.mul(rate);
}

module.exports = {
  getNextFundingRate,
  getFundingFee,
  getFundingRate,
};
