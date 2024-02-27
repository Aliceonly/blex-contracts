// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {MarketConfigStruct} from "../market/MarketConfigStruct.sol";
import {Position} from "../position/PositionStruct.sol";

import {MarketDataTypes} from "../market/MarketDataTypes.sol";

import {IPositionBook} from "../position/interfaces/IPositionBook.sol";
import {IFeeRouter} from "../fee/interfaces/IFeeRouter.sol";
import "./../utils/TransferHelper.sol";
import {IMarketValid, IMarketValidFuncs} from "../market/interfaces/IMarketValid.sol";

contract MockMarketVaild {
    IMarketValid.Props public conf;

    function validPay(uint256 _pay) public view {}

    function validIncreaseOrder(
        MarketDataTypes.UpdateOrderInputs memory _vars,
        int256 fees
    ) external view {}

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

    function isLiquidate(
        address _account,
        address _market,
        bool _isLong,
        IPositionBook positionBook,
        IFeeRouter feeRouter,
        uint256 markPrice
    ) public view returns (uint256) {
        return 0;
    }

    // function conf() external view returns (IMarketValid.Props memory data) {}

    function setConfData(uint256 _data) external {}

    function validLev(uint256 newSize, uint256 newCollateral) public {}
}
