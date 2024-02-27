// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

import {IOrderStore} from "./interface/IOrderStore.sol";
import {Order} from "./OrderStruct.sol";
import {IOrderBook} from "./interface/IOrderBook.sol";
import "../ac/Ac.sol";
import {OrderLib} from "./OrderLib.sol";
import {MarketDataTypes} from "../market/MarketDataTypes.sol";

contract OrderBook is IOrderBook, Ac {
    using Order for Order.Props;
    using MarketDataTypes for MarketDataTypes.UpdateOrderInputs;

    uint256 public constant MAX_ORDER_LIMIT = 9999;

    IOrderStore public override openStore;
    IOrderStore public override closeStore;
    bool public isLong;

    constructor(address _f) Ac(_f) {
        _disableInitializers();
    }

    function initialize(
        bool _isLong,
        address _openStore,
        address _closeStore
    ) external initializer {
        isLong = _isLong;
        openStore = IOrderStore(_openStore);
        try openStore.initialize(_isLong) {} catch {}

        closeStore = IOrderStore(_closeStore);
        try closeStore.initialize(_isLong) {} catch {}
    }

    function getExecutableOrdersByPrice(
        uint256 start,
        uint256 end,
        bool isOpen,
        uint256 _oraclePrice
    ) external view override returns (Order.Props[] memory _orders) {
        require(_oraclePrice > 0, "oraclePrice zero");
        IOrderStore _store = isOpen ? openStore : closeStore;
        bytes32[] memory keys = _store.getKeys(start, end);
        uint256 _listCount;
        uint256 _len = keys.length;
        for (uint256 index; index < _len; ) {
            bytes32 key = keys[index];
            Order.Props memory _open = _store.orders(key);
            if (
                (_open.isMarkPriceValid(_oraclePrice) && key != bytes32(0)) ||
                _open.isFromMarket(isOpen)
            ) {
                unchecked {
                    ++_listCount;
                }
                if (_listCount >= MAX_ORDER_LIMIT) {
                    break;
                }
            }
            unchecked {
                ++index;
            }
        }
        _orders = new Order.Props[](_listCount);

        uint256 _orderKeysIdx;
        for (uint256 index; index < _len; ) {
            bytes32 key = keys[index];
            Order.Props memory _open = _store.orders(key);
            if (
                (_open.isMarkPriceValid(_oraclePrice) && key != bytes32(0)) ||
                _open.isFromMarket(isOpen)
            ) {
                _orders[_orderKeysIdx] = _open;
                unchecked {
                    ++_orderKeysIdx;
                }
                if (_orderKeysIdx >= MAX_ORDER_LIMIT) {
                    break;
                }
            }
            unchecked {
                ++index;
            }
        }
    }

    /**
     * @dev Sets up the triggerAbove parameter for an order based on the provided variables.
     * @param _vars The update order inputs.
     * @param _order The order properties.
     * @return _order The updated order with the triggerAbove parameter set.
     */
    function _setupTriggerAbove(
        MarketDataTypes.UpdateOrderInputs memory _vars,
        Order.Props memory _order
    ) private pure returns (Order.Props memory) {
        if (_vars.isFromMarket()) {
            _order.setTriggerAbove(_vars.isOpen == !_vars._isLong);
            _order.setIsFromMarket(true);
        } else {
            if (_vars.isOpen) {
                _order.setTriggerAbove(!_vars._isLong);
            } else if (_vars._order.triggerAbove == 0) {
                _order.setTriggerAbove(_vars._oraclePrice < _order.price);
            } else {
                _order.triggerAbove = _vars._order.triggerAbove;
            }
        }
        return _order;
    }

    function add(
        MarketDataTypes.UpdateOrderInputs[] memory _vars
    ) external override onlyController returns (Order.Props[] memory _orders) {
        _orders = new Order.Props[](_vars.length);
        for (uint256 i; i < _vars.length; ) {
            Order.Props memory _order = _vars[i]._order;
            _order.version = Order.STRUCT_VERSION;
            _order.orderID = uint64(
                (_vars[i].isOpen ? openStore : closeStore).generateID(
                    _order.account
                )
            );
            _order = _setupTriggerAbove(_vars[i], _order);
            _orders[i] = _order;
            unchecked {
                ++i;
            }
        }

        if (_orders.length == 2) {
            _orders[0].setPairKey(_orders[1].orderID);
            _orders[1].setPairKey(_orders[0].orderID);
        }

        for (uint256 i; i < _orders.length; ) {
            Order.Props memory _order = _orders[i];
            _validInputParams(_order, _vars[i].isOpen);

            (_vars[i].isOpen ? openStore : closeStore).add(_order);
            unchecked {
                ++i;
            }
        }
    }

    function update(
        MarketDataTypes.UpdateOrderInputs memory _vars
    ) external override onlyController returns (Order.Props memory _order) {
        bytes32 okey = _vars._order.getKey();
        IOrderStore os = _vars.isOpen ? openStore : closeStore;
        require(os.containsKey(okey), "OrderBook:invalid orderKey");
        _order = os.orders(okey);
        require(
            _order.version == Order.STRUCT_VERSION,
            "OrderBook:wrong version"
        );

        _order.price = _vars._order.price;

        _order = _setupTriggerAbove(_vars, _order);

        if (_vars.isOpen) {
            _order.setTakeprofit(_vars._order.getTakeprofit());
            _order.setStoploss(_vars._order.getStoploss());
        }
        _validInputParams(_order, _vars.isOpen);
        os.set(_order);
    }

    /**
     * @dev Called by `Market`.Removes all orders associated with a specific account.
     * @param isOpen Determines whether to remove open or close orders.
     * @param account The account address.
     * @return _orders An array of removed order properties.
     */
    function removeByAccount(
        bool isOpen,
        address account
    ) external override onlyController returns (Order.Props[] memory _orders) {
        if (account != address(0)) {
            return (isOpen ? openStore : closeStore).delByAccount(account);
        }
    }

    /**
     * @dev Called by `Market`.Removes a specific order based on the account and order ID.
     * @param account The account address.
     * @param orderID The order ID.
     * @param isOpen Determines whether to remove an open or close order.
     * @return _orders An array of removed order properties.
     */
    function remove(
        address account,
        uint256 orderID,
        bool isOpen
    ) external override onlyController returns (Order.Props[] memory _orders) {
        _orders = remove(OrderLib.getKey(account, uint64(orderID)), isOpen);
    }

    /**
     * @dev Called by `Market`.Removes a specific order based on the key and whether it is open or close.
     * @param key The order key.
     * @param isOpen Determines whether to remove an open or close order.
     * @return _orders An array of removed order properties.
     */
    function remove(
        bytes32 key,
        bool isOpen
    ) public override onlyController returns (Order.Props[] memory _orders) {
        IOrderStore s = isOpen ? openStore : closeStore;
        if (false == isOpen) {
            bytes32 pairKey = s.orders(key).getPairKey();
            _orders = new Order.Props[](pairKey != bytes32(0) ? 2 : 1);
            if (pairKey != bytes32(0)) _orders[1] = s.remove(pairKey);
        } else _orders = new Order.Props[](1);
        _orders[0] = s.remove(key);
    }

    /**
     * @dev Validates the input parameters of an order.
     * @param _order The order properties.
     * @param _isOpen Determines whether the order is open or close.
     */
    function _validInputParams(
        Order.Props memory _order,
        bool _isOpen
    ) private view {
        if (_isOpen) {
            _order.validTPSL(isLong);
            require(_order.collateral > 0, "OB:invalid collateral");
        }
        require(_order.account != address(0), "OrderBook:invalid account");
        require(_order.triggerAbove != 0, "OB:trigger above init");
    }
}
