// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import {MarketConfigStruct} from "../market/MarketConfigStruct.sol";
import {IMarketValid, IMarketValidFuncs} from "../market/interfaces/IMarketValid.sol";

contract MarketValidReader {
    using MarketConfigStruct for IMarketValid.Props;

    address public marketValid;

    constructor(address _addr) {
        marketValid = _addr;
    }

    function getConf() external view returns (uint256) {
        return IMarketValid(marketValid).conf().data;
    }

    function getMinLev() external view returns (uint) {
        IMarketValid.Props memory _confg = IMarketValid(marketValid).conf();
        return _confg.getMinLev();
    }

    function minSlippage() external view returns (uint) {
        IMarketValid.Props memory _confg = IMarketValid(marketValid).conf();
        return _confg.getMinSlippage();
    }

    function maxSlippage() external view returns (uint) {
        IMarketValid.Props memory _confg = IMarketValid(marketValid).conf();
        return _confg.getMaxSlippage();
    }

    function getMaxLev() external view returns (uint) {
        return IMarketValid(marketValid).conf().getMaxLev();
    }

    function getMinPay() external view returns (uint) {
        return IMarketValid(marketValid).conf().getMinPay();
    }

    function getMinCollateral() external view returns (uint) {
        return IMarketValid(marketValid).conf().getMinCollateral();
    }

    function getMaxTradeAmount() external view returns (uint) {
        return IMarketValid(marketValid).conf().getMaxTradeAmount();
    }

    function getAllowOpen() external view returns (bool) {
        return IMarketValid(marketValid).conf().getAllowOpen();
    }

    function getAllowClose() external view returns (bool) {
        return IMarketValid(marketValid).conf().getAllowClose();
    }
}
