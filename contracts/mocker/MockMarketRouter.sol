// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {MarketDataTypes} from "../market/MarketDataTypes.sol";

import {MarketPositionCallBackIntl, MarketOrderCallBackIntl, MarketCallBackIntl} from "../market/interfaces/IMarketCallBackIntl.sol";

contract MockMarketRouter {
    function updatePositionBook(address newA) external {}

    function vaultRouter() external view returns (address) {
        return address(this);
    }

    function getGlobalPNL() external view returns (int256 pnl) {
        return 10000;
    }

    function getGlobalSize()
        external
        view
        returns (uint256 sizesLong, uint256 sizesShort)
    {
        return (10000, 10000);
    }

    function getAccountSize(
        address account
    ) external view returns (uint256 sizesL, uint256 sizesS) {
        return (10000, 10000);
    }

    function addMarket(address) external {}

    function removeMarket(address) external {}

    function validateIncreasePosition(
        MarketDataTypes.UpdatePositionInputs memory _inputs
    ) external view {}

    function deleteOrderCallback(
        MarketOrderCallBackIntl.DeleteOrderEvent memory e
    ) external {}

    function updateOrderCallback(
        MarketDataTypes.UpdateOrderInputs memory _event
    ) external {}

    function updatePositionCallback(
        MarketPositionCallBackIntl.UpdatePositionEvent memory _event
    ) external {}

    function getHooksCalls()
        external
        pure
        returns (MarketCallBackIntl.Calls memory)
    {
        return
            MarketCallBackIntl.Calls({
                updatePosition: true,
                updateOrder: true,
                deleteOrder: true
            });
    }
}
