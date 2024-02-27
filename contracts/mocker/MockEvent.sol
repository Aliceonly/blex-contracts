// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;
import {MarketDataTypes} from "../market/MarketDataTypes.sol";

import {MarketPositionCallBackIntl, MarketOrderCallBackIntl} from "../market/interfaces/IMarketCallBackIntl.sol";
import {Order} from "../order/OrderStruct.sol";

import {OrderLib} from "./../order/OrderLib.sol";

contract MockEvent {
    event UpdatePosition(
        address indexed account,
        uint256 collateralDelta,
        int256 collateralDeltaAfter,
        uint256 sizeDelta,
        bool isLong,
        uint256 price,
        int256 pnl,
        int256[] fees,
        address market,
        address collateralToken,
        address indexToken,
        uint256 category, // maxcode size
        uint64 fromOrder
    );

    event UpdateOrder(
        address indexed account, //0
        bool isLong, //1
        bool isIncrease, //2 if false, trade type == "trigger", otherwise, type =="limit"
        uint256 orderID, //3
        address market, //4 -> market name
        // -------------------
        // address collateralToken, //TODO: fix me multi collateral token
        uint256 size, //5
        uint collateral, //6
        uint256 triggerPrice, //7
        bool triggerAbove, // 8TODO, set to bool
        uint tp, //9
        uint sl, //10
        uint128 fromOrder,
        bool isKeepLev
    );

    /**
     * 1. limit -> trigger(order
     */
    event DeleteOrder(
        address indexed account,
        bool isLong,
        bool isIncrease,
        uint256 orderID,
        address market,
        uint8 reason,
        uint256 price,
        int256 dPNL
    );

    function updateOrderCallback(
        MarketDataTypes.UpdateOrderInputs memory _event
    ) external {
        emit UpdateOrder(
            _event._order.account,
            _event._isLong,
            _event.isOpen,
            _event._order.orderID,
            _event._market,
            _event._order.size,
            _event._order.collateral,
            _event._order.price,
            true,
            0,
            0,
            _event._order.extra0,
            true
        );
    }

    function updatePositionCallback(
        MarketPositionCallBackIntl.UpdatePositionEvent memory _event
    ) external {
        emit UpdatePosition(
            _event.inputs._account,
            _event.inputs.collateralDelta,
            _event.collateralDeltaAfter,
            _event.inputs._sizeDelta,
            _event.inputs._isLong,
            _event.inputs._oraclePrice,
            _event.position.realisedPnl,
            _event.fees,
            _event.inputs._market,
            _event.collateralToken,
            _event.indexToken,
            1,
            _event.inputs._fromOrder
        );
    }

    function deleteOrderCallback(
        MarketOrderCallBackIntl.DeleteOrderEvent memory e
    ) external {
        emit DeleteOrder(
            e.order.account,
            e.inputs._isLong,
            e.inputs.isOpen,
            e.order.orderID,
            e.inputs._market,
            e.reason,
            e.inputs._oraclePrice,
            e.dPNL
        );
    }
}
