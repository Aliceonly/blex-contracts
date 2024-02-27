// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

import "../utils/EnumerableValues.sol";
import "./OrderStruct.sol";
import "../ac/Ac.sol";

contract OrderStore is Ac {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableValues for EnumerableSet.Bytes32Set;
    using Order for Order.Props;

    bool public isLong;

    mapping(bytes32 => Order.Props) public orders;
    EnumerableSet.Bytes32Set internal orderKeys;
    mapping(address => uint256) public ordersIndex;
    mapping(address => uint256) public orderNum;

    mapping(address => EnumerableSet.Bytes32Set) internal ordersByAccount; // position => order

    constructor(address _f) Ac(_f) {
        _disableInitializers();
    }

    function initialize(bool _isLong) external initializer {
        isLong = _isLong;
    }

    /**
     * @dev Called by `OrderBook`.Adds an order to the order store.
     * @param order The order to be added.
     */
    event Add(Order.Props order);

    function add(Order.Props memory order) external onlyController {
        order.updateTime();
        bytes32 key = order.getKey();
        orders[key] = order;
        orderKeys.add(key);
        orderNum[order.account] += 1;
        ordersByAccount[order.account].add(order.getKey());

        emit Add(order);
    }

    /**
     * @dev Called by `OrderBook`.Sets an order in the order store.
     * @param order The order to be set.
     */
    event Set(Order.Props order);

    function set(Order.Props memory order) external onlyController {
        bytes32 key = order.getKey();
        order.updateTime();
        orders[key] = order;

        emit Set(order);
    }

    /**
     * @dev Called by `OrderBook`.Removes an order from the order store.
     * @param key The key of the order to be removed.
     * @return order The removed order.
     */
    function remove(
        bytes32 key
    ) external onlyController returns (Order.Props memory order) {
        if (orderKeys.contains(key)) {
            order = _remove(key);
        }
    }

    event Remove(Order.Props order);
    /**
     * @dev Internal function to remove an order from the order store.
     * @param key The key of the order to be removed.
     * @return _order The removed order.
     */
    function _remove(bytes32 key) internal returns (Order.Props memory _order) {
        _order = orders[key];
        orderNum[_order.account] -= 1;
        delete orders[key];
        orderKeys.remove(key);
        ordersByAccount[_order.account].remove(key);

        emit Remove(_order);
    }

    /**
     * @dev Filters the orders based on the given order keys.
     * @param _ordersKeys The array of order keys to be filtered.
     * @return orderCount The count of valid orders.
     */
    function _filterOrders(
        bytes32[] memory _ordersKeys
    ) internal view returns (uint256 orderCount) {
        uint256 len = _ordersKeys.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 _orderKey = _ordersKeys[i];
            if (orderKeys.contains(_orderKey)) {
                orderCount++;
            }
        }
    }

    event DelByAccount(Order.Props[] orders);
    /**
     * @dev Called by `OrderBook`.Removes all orders associated with an account from the order store.
     * @param account The account address.
     * @return _orders The array of removed orders.
     */
    function delByAccount(
        address account
    ) external onlyController returns (Order.Props[] memory _orders) {
        bytes32[] memory _ordersKeys = ordersByAccount[account].values();
        uint256 orderCount = _filterOrders(_ordersKeys);
        uint256 len = _ordersKeys.length;

        _orders = new Order.Props[](orderCount);
        uint256 readIdx;
        for (uint256 i = 0; i < len && readIdx < orderCount;) {
            bytes32 _orderKey = _ordersKeys[i];
            if (orderKeys.contains(_orderKey)) {
                Order.Props memory _order = _remove(_orderKey);
                _orders[readIdx] = _order;
                unchecked {
                    readIdx++;
                }
            }
            unchecked {
                i++;
            }
        }

        // Delete the ordersByAccount mapping for the specified account
        delete ordersByAccount[account];

        emit DelByAccount(_orders);
    }

    /**
     * @dev Retrieves all orders associated with an account from the order store.
     * @param account The account address.
     * @return _orders The array of retrieved orders.
     */
    function getOrderByAccount(
        address account
    ) external view returns (Order.Props[] memory _orders) {
        bytes32[] memory _ordersKeys = ordersByAccount[account].values();
        uint256 orderCount = _filterOrders(_ordersKeys);

        _orders = new Order.Props[](orderCount);
        uint256 readIdx;
        uint256 len = _ordersKeys.length;
        for (uint256 i = 0; i < len && readIdx < orderCount;) {
            bytes32 _orderKey = _ordersKeys[i];
            if (orderKeys.contains(_orderKey)) {
                Order.Props memory _order = orders[_orderKey];
                _orders[readIdx] = _order;
                unchecked {
                    ++readIdx;
                }
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Retrieves an order from the order store by index.
     * @param index The index of the order.
     * @return order The retrieved order.
     */
    function getByIndex(
        uint256 index
    ) external view returns (Order.Props memory) {
        return orders[orderKeys.at(index)];
    }

    /**
     * @dev Checks if the given key exists in the order store.
     * @param key The key to check.
     * @return Whether the key exists or not.
     */
    function containsKey(bytes32 key) external view returns (bool) {
        return orderKeys.contains(key);
    }

    /**
     * @dev Retrieves the total count of orders in the order store.
     * @return The total count of orders.
     */
    function getCount() external view returns (uint256) {
        return orderKeys.length();
    }

    /**
     * @dev Retrieves the order key at the specified index.
     * @param _index The index of the order key.
     * @return The order key.
     */
    function getKey(uint256 _index) external view returns (bytes32) {
        return orderKeys.at(_index);
    }

    /**
     * @dev Retrieves a range of order keys from the order store.
     * @param start The starting index of the range.
     * @param end The ending index of the range.
     * @return An array of order keys within the specified range.
     */
    function getKeys(
        uint256 start,
        uint256 end
    ) external view returns (bytes32[] memory) {
        return orderKeys.valuesAt(start, end);
    }

    /**
     * @dev Called by `OrderBook`.Generates a unique ID for an order associated with the given account.
     * @param _acc The account address.
     * @return retVal The generated ID for the order.
     */
    function generateID(
        address _acc
    ) external onlyController returns (uint256 retVal) {
        retVal = ordersIndex[_acc];
        if (retVal == 0) {
            retVal = 1;
        }
        unchecked {
            ordersIndex[_acc] = retVal + 1;
        }
    }
}
