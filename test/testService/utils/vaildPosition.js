const { BigNumber: BN } = require("ethers");
const {
  getAllowClose,
  getAllowOpen,
  getMaxLev,
  getMinLev,
  getMinPay,
  getMinCollateral,
  getMaxSlippage,
  getMaxTradeAmount,
} = require("./getConfData");
const { totalFees } = require("./utils");
const DECIMALS = 10000;
const DENOMINATOR_SLIPPAGE = 10000;

function vaildPosition({ params, position, fees }) {
  validSize({
    size: position.size,
    sizeDelta: params._sizeDelta,
    isIncrease: params.isOpen,
  });

  if (params.isOpen) {
    vaildPay({
      pay: params.collateralDelta,
    });

    validCollateralDelta({
      busType: params.collateralDelta.gt(0) ? 1 : 2,
      collateral: position.collateral,
      collateralDelta: params.collateralDelta,
      size: position.size,
      sizeDelta: params._sizeDelta,
      fees: totalFees(fees),
    });
  } else {
    if (!params._sizeDelta.eq(position.size)) {
      validCollateralDelta({
        busType: params.collateralDelta.gt(0) ? 3 : 4,
        collateral: position.collateral,
        collateralDelta: params.collateralDelta,
        size: position.size,
        sizeDelta: params._sizeDelta,
        fees: totalFees(fees),
      });
    }
  }
  //lte
  if (params._sizeDelta.gt(0) && params.liqState == 0) {
    if (params._oraclePrice.lt(0)) {
      throw new Error("invalid oracle price");
    }
    validSlippagePrice({
      _inputs: params,
    });
  }
}

function validSize({ size, sizeDelta, isIncrease }) {
  if (isIncrease == false) {
    if (size.lt(sizeDelta)) {
      console.log("error", size, sizeDelta);
      throw new Error("MarketValid:Size");
    }
  }
}

function validCollateralDelta({
  busType, //1. increase 2. increase coll 3.decrease 4.decrease coll
  collateral,
  collateralDelta,
  size,
  sizeDelta,
  fees,
}) {
  if ((!getAllowOpen() && busType <= 2) || (!getAllowClose() && busType > 2)) {
    throw new Error("MarketVaild:MarketClosed");
  }

  if (!BN.isBigNumber(collateral)) {
    collateral = BN.from(0);
  }

  if (!BN.isBigNumber(size)) {
    size = BN.from(0);
  }

  if (busType > 2 && sizeDelta.eq(size)) return;
  let newCollateral =
    busType < 3
      ? collateral.add(collateralDelta)
      : collateral.sub(collateralDelta);
  //
  if (busType == 3 && newCollateral.eq(0)) return;
  if (fees.gt(0)) {
    newCollateral = newCollateral.sub(fees);
  } else {
    newCollateral = newCollateral.add(fees.mul(-1));
  }

  if (
    (collateral == 0 && busType == 1 && collateralDelta.lt(getMinPay())) ||
    (busType > 2 && newCollateral.lt(getMinCollateral()))
  ) {
    throw new Error("MarketValid:Collateral");
  }

  let newSize = size;

  if (busType == 1) {
    newSize = newSize.add(sizeDelta);
  } else if (busType == 3) {
    newSize = newSize.sub(sizeDelta);
  }

  let lev = newSize.div(newCollateral).toNumber();
  if (lev > getMaxLev() || lev < getMinLev()) {
    console.log("lev", lev, newSize, newCollateral);
    throw new Error("MarketValid:Lev");
  }
}

function validSlippagePrice({ _inputs }) {
  if (_inputs._slippage > getMaxSlippage()) {
    _inputs._slippage = getMaxSlippage();
  }
  let _slippagePrice;
  if (_inputs._isLong == _inputs.isOpen) {
    _slippagePrice = _inputs._price.add(
      _inputs._price.mul(_inputs._slippage).div(DENOMINATOR_SLIPPAGE)
    );
  } else {
    _slippagePrice = _inputs._price.sub(
      _inputs._price.mul(_inputs._slippage).div(DENOMINATOR_SLIPPAGE)
    );
  }
  validMarkPrice({
    isLong: _inputs._isLong,
    price: _slippagePrice,
    isIncrease: _inputs.isOpen,
    isExec: _inputs._isExec,
    marketPrice: _inputs._oraclePrice,
  });
}

function validMarkPrice({ isLong, price, isIncrease, isExec, marketPrice }) {
  if (price.lte(0)) {
    throw new Error("MarketValid:input price zero");
  }

  if (marketPrice.lte(0)) {
    throw new Error("MarketValid:!oracle");
  }

  if (!isExec) {
    if (!((isLong == isIncrease) == price.gt(marketPrice))) {
      throw new Error("MarketValid:!front-end price");
    }
  }
}

function validateLiquidation({
  pnl,
  fees,
  liquidateFee,
  collateral,
  size,
  _raise,
}) {
  if (pnl.lt(0) && collateral.add(pnl).lt(0)) {
    if (_raise) {
      throw new Error("MarketValid:losses exceed collateral");
    }
    return 1;
  }
  console.log("pnl", pnl);
  let remainingCollateral = collateral; // 86
  if (pnl.lt(0)) {
    remainingCollateral = collateral.add(pnl); // 86 - 78.9
  }

  if (remainingCollateral.lt(fees)) {
    if (_raise) {
      revert("MarketValid: fees exceed collateral");
    }
    // cap the fees to the remainingCollateral
    return 1;
  }

  if (remainingCollateral.lt(fees.add(liquidateFee))) {
    // 7.1 < 5 + 1.72
    if (_raise) {
      throw new Error("MarketValid: liquidation fees exceed collateral");
    }
    return 1;
  }

  console.log("remainingCollateral", remainingCollateral);
  console.log("getMaxLev", getMaxLev());
  console.log("DECIMALS", DECIMALS);
  console.log("size", size);
  console.log(remainingCollateral.mul(getMaxLev()).mul(DECIMALS));
  if (
    remainingCollateral.mul(getMaxLev()).mul(DECIMALS).lt(size.mul(DECIMALS))
  ) {
    if (_raise) {
      throw new Error("MarketValid: maxLeverage exceeded");
    }
    return 2;
  }

  return 0;
}

function validTPSL({ triggerPrice, tpPrice, slPrice, isLong = true }) {
  if (tpPrice.gt(0)) {
    if (tpPrice.gt(triggerPrice) != isLong || tpPrice.eq(triggerPrice)) {
      throw new Error("MarketValid:Tp");
    }
  }

  if (slPrice.gt(0)) {
    if (isLong != triggerPrice.gt(slPrice) || slPrice.eq(triggerPrice)) {
      throw new Error("MarketValid:Sl");
    }
  }
}

function getDecreaseDeltaCollateral({
  size,
  dsize,
  collateral,
  isKeepLev = true,
}) {
  if (isKeepLev) {
    return collateral.mul(dsize).div(size);
  } else {
    return 0;
  }
}

function vaildPay({ pay }) {
  if (pay.gt(getMaxTradeAmount())) {
    throw new Error("MarketValid:pay>MaxTradeAmount");
  }
}

function vaildDecreaseOrder({
  collateral,
  collateralDelta,
  size,
  sizeDelta,
  fees,
  decrOrderCount,
}) {
  if (decrOrderCount.add(1).gt(10)) {
    throw new Error("MarketValid:trigger num");
  }
  validSize({
    size,
    sizeDelta,
    isIncrease: false,
  });
  //check collateral
  validCollateralDelta({
    busType: 3,
    collateral: collateral,
    collateralDelta,
    size,
    sizeDelta,
    fees,
  });
}

module.exports = {
  validCollateralDelta,
  vaildPosition,
  validTPSL,
  validateLiquidation,
  getDecreaseDeltaCollateral,
  validSize,
  vaildDecreaseOrder,
};
