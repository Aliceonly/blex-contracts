// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {MarketConfigStruct} from "../market/MarketConfigStruct.sol";
import {Position} from "../position/PositionStruct.sol";
import {IMarketValid} from "../market/interfaces/IMarketValid.sol";

import {MarketDataTypes} from "../market/MarketDataTypes.sol";

import {IPositionBook} from "../position/interfaces/IPositionBook.sol";
import {IFeeRouter} from "../fee/interfaces/IFeeRouter.sol";

contract MockMarketVaildSub {
    function validPay(uint256 _pay) public view {}

    function getDecreaseOrderValidation(uint256) external returns (bool) {
        return true;
    }

    function validPosition(
        MarketDataTypes.UpdatePositionInputs memory _params,
        Position.Props memory _position,
        int256[] memory fees
    ) external view {}

    function validCollateralDelta(
        uint256 busType, // 1:increase 2. increase coll 3. decrease 4. decrease coll
        uint256 _collateral,
        uint256 _collateralDelta,
        uint256 _size,
        uint256 _sizeDelta,
        int256 _fees
    ) public view {}

    function conf() external view returns (IMarketValid.Props memory data) {}

    function setConfData(uint256 _data) external {}

    function isLiquidate(
        address _account,
        address _market,
        bool _isLong,
        IPositionBook positionBook,
        IFeeRouter feeRouter,
        uint256 markPrice
    ) public view returns (uint256) {
        if (_isLong == false) {
            return 0;
        }
        return 2;
    }

    function validLev(uint256 newSize, uint256 newCollateral) public {}
}
