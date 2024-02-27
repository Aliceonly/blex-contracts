// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IOrderBook} from "../order/interface/IOrderBook.sol";
import {IPrice} from "../oracle/interfaces/IPrice.sol";
import {IFeeRouter} from "../fee/interfaces/IFeeRouter.sol";
import {Calc} from "../utils/Calc.sol";
import {IMarketValid} from "./interfaces/IMarketValid.sol";
import {MarketLib} from "./MarketLib.sol";
import {Order} from "../order/OrderStruct.sol";
import {OrderLib} from "./../order/OrderLib.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {MarketConfigStruct} from "./MarketConfigStruct.sol";
import {MarketPositionCallBackIntl, MarketOrderCallBackIntl} from "./interfaces/IMarketCallBackIntl.sol";
import {MarketDataTypes} from "./MarketDataTypes.sol";
import {Position} from "../position/PositionStruct.sol";
import {IReferral} from "../referral/interfaces/IReferral.sol";
import {TransferHelper} from "./../utils/TransferHelper.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MarketStorage.sol";
import "../ac/Ac.sol";
import {StringsPlus} from "./../utils/Strings.sol";

contract OrderMgr is MarketStorage, ReentrancyGuard, Ac {
    using SafeCast for int256;
    using SafeCast for uint256;
    using Order for Order.Props;
    using MarketLib for uint16;
    using MarketDataTypes for int256[];
    using MarketDataTypes for MarketDataTypes.UpdateOrderInputs;
    using MarketDataTypes for MarketDataTypes.UpdatePositionInputs;

    constructor() Ac(address(0)) {
        _disableInitializers();
    }

    function _shouldDeleteOrder(
        string memory errorMessage
    ) internal pure returns (bool) {
        return !StringsPlus.equals(errorMessage, StringsPlus.POSITION_TRIGGER_ABOVE);
    }

    /**
     * Called by `MarketRouter`.The `updateOrder` function is used to update an order on the order book. It validates inputs,
     * calculates fees, and triggers events. Depending on the order's state, it either adds a new order or
     * updates an existing one. It also selects the correct order book based on whether the order is long or
     * short. If the order is being created, it calculates the required collateral based on the order size
     * and account position, and validates it against the position collateral and order fees. Finally, it
     * triggers the `afterUpdateOrder` event.
     * */
    function updateOrder(
        MarketDataTypes.UpdateOrderInputs memory _vars
    ) external {
        if (_vars.isOpen && _vars.isCreate) {
            marketValid.validPay(_vars.pay());
        }

        _vars._oraclePrice = _getPrice(_vars._isLong == _vars.isOpen);
        if (_vars.isFromMarket()) {
            if (_vars.isOpen == _vars._isLong)
                _vars._order.price = (_vars._order.price +
                    (_vars._order.price * _vars.slippage()) /
                    MarketConfigStruct.DENOMINATOR_SLIPPAGE).toUint128();
            else
                _vars._order.price = (_vars._order.price -
                    (_vars._order.price * _vars.slippage()) /
                    MarketConfigStruct.DENOMINATOR_SLIPPAGE).toUint128();
        }

        IOrderBook ob = _vars._isLong ? orderBookLong : orderBookShort;
        if (_vars.isCreate && _vars.isOpen) {
            marketValid.validIncreaseOrder(_vars, feeRouter.getOrderFees(_vars));

            _vars._order.collateral = _vars.pay().toUint128();
        } else if (_vars.isCreate && !_vars.isOpen) {
            Position.Props memory _position = positionBook.getPosition(
                _vars._order.account,
                _vars._oraclePrice,
                _vars._isLong
            );
            _vars._order.collateral = MarketLib
                .getDecreaseDeltaCollateral(
                    _vars._order.extra3 > 0,
                    _position.size,
                    uint256(_vars._order.size),
                    _position.collateral
                )
                .toUint128();

            marketValid.validDecreaseOrder(
                _position.collateral,
                uint256(_vars._order.collateral),
                _position.size,
                _vars._order.size,
                feeRouter.getOrderFees(_vars),
                orderStore(_vars._isLong, _vars.isOpen).orderNum(
                    _vars._order.account
                )
            );
        }

        MarketDataTypes.UpdateOrderInputs[]
            memory orderVars = new MarketDataTypes.UpdateOrderInputs[](1);
        orderVars[0] = _vars;
        _vars._order = _vars.isCreate ? ob.add(orderVars)[0] : ob.update(_vars);

        MarketLib.afterUpdateOrder(
            _vars,
            PLUGIN_GAS_LIMIT,
            plugins,
            collateralToken,
            address(this)
        );
    }

    function _getPrice(bool _isMax) private view returns (uint256) {
        IPrice _p = IPrice(priceFeed);
        return _p.getPrice(indexToken, _isMax);
    }

    /**
     * Called by `MarketRouter`.The `cancelOrderList` function cancels multiple orders belonging to a given account. It requires
     * administrative access control or controller role. It takes in three arrays: one containing booleans
     * that specify whether each order being cancelled is an increase or decrease order, another containing
     * the order IDs, and a third containing booleans that specify whether each order is long or short.
     * The function iterates over each order, removes it from the order book, and calls `_cancelOrder`
     * to calculate the refundable collateral amount. Finally, it transfers the refunded collateral to the
     * account.
     */
    function cancelOrderList(
        address _account,
        bool[] memory _isIncreaseList,
        uint256[] memory _orderIDList,
        bool[] memory _isLongList
    ) external {
        require(
            _isIncreaseList.length == _orderIDList.length,
            "OrderMgr:input length"
        );
        require(
            _isLongList.length == _orderIDList.length,
            "OrderMgr:input length"
        );
        uint len = _orderIDList.length;
        uint256 collateralRefund;
        for (uint256 i; i < len; ++i) {
            Order.Props[] memory _ors = (
                _isLongList[i] ? orderBookLong : orderBookShort
            ).remove(_account, _orderIDList[i], _isIncreaseList[i]);
            for (uint256 j; j < _ors.length; ++j) {
                if (_ors[j].orderID == 0) continue;
                collateralRefund += _cancelOrder(
                    CancelOrderCache(
                        _ors[j],
                        _isLongList[i],
                        _isIncreaseList[i],
                        false,
                        false,
                        ""
                    )
                );
            }
        }
        TransferHelper.transferOut(collateralToken, _account, collateralRefund);
    }

    /**
     * @notice Called by `Market`.Allows manager to cancel orders from the order book by specifying an array of order keys,
     *  whether the order is long or short, and whether the order is to be increased or decreased.
     * @dev Only callable by the system contract
     * @param _orderKey An array of order keys
     * @param _isLong An array indicating whether each order is a long order
     * @param _isIncrease An array indicating whether each order is to be increased or decreased
     */
    function sysCancelOrder(
        bytes32[] memory _orderKey,
        bool[] memory _isLong,
        bool[] memory _isIncrease,
        string[] memory reasons
    ) external {
        require(_orderKey.length == _isLong.length);
        require(_isIncrease.length == _isLong.length);
        for (uint i = 0; i < _orderKey.length; i++) {
            if (_orderKey[i] == bytes32(0)) continue;
            if (false == _shouldDeleteOrder(reasons[i])) continue;
            IOrderBook ob = _isLong[i] ? orderBookLong : orderBookShort;
            if (
                false ==
                (_isIncrease[i] ? ob.openStore() : ob.closeStore()).containsKey(
                    _orderKey[i]
                )
            ) continue; //skip if order not exists
            Order.Props[] memory exeOrders = ob.remove(
                _orderKey[i],
                _isIncrease[i]
            );
            for (uint j = 0; j < exeOrders.length; j++) {
                if (exeOrders[j].orderID == 0) continue;
                _cancelOrder(
                    CancelOrderCache(
                        exeOrders[j],
                        _isLong[i],
                        _isIncrease[i],
                        true,
                        true,
                        reasons[i]
                    )
                );
            }
        }
    }

    struct CancelOrderCache {
        Order.Props order;
        bool isLong;
        bool isIncrease;
        bool isTransferToUser;
        bool isExec;
        string reasonStr;
    }

    /**
     * @dev Cancels an order, returns the collateral or transfers it to the user based on parameters passed
     * @param _cache.order The order that needs to be canceled
     * @param _cache.isLong A boolean value representing whether the order is for a long position
     * @param _cache.isIncrease A boolean value representing whether the order is increasing a position or not
     * @param _cache.isTransferToUser A boolean value representing whether the collateral needs to be transferred to the user or not
     * @param _cache.isExec A boolean value representing whether the order is being executed or not
     * @param _cache.reasonStr A string value representing the cancel reason
     * @return collateralRefund The collateral amount that needs to be refunded to the user
     */
    function _cancelOrder(
        CancelOrderCache memory _cache
    ) internal returns (uint256 collateralRefund) {
        uint256 execFee = _cache.isExec
            ? feeRouter.getExecFee(address(this))
            : 0;
        if (execFee > _cache.order.collateral) return 0;
        uint256 feeAmount = TransferHelper.formatCollateral(
            uint256(execFee),
            IERC20Metadata(collateralToken).decimals()
        );

        if (_cache.isIncrease) {
            if (execFee > 0) {
                IERC20(collateralToken).approve(address(feeRouter), feeAmount);
                int256[] memory _fees = new int256[](4);
                _fees[3] = int256(execFee);
                feeRouter.collectFees(
                    _cache.order.account,
                    collateralToken,
                    _fees
                );
            }
            if (_cache.isTransferToUser) {
                TransferHelper.transferOut(
                    collateralToken,
                    _cache.order.account,
                    _cache.order.collateral - execFee
                );
            } else {
                // OMB-03 COLLATERAL TO BE REFUNDED SHOULD SUBTRACT THE execFee
                collateralRefund = _cache.order.collateral - execFee;
            }
        } else if (_cache.isExec) {
            uint256 decreasedCollateral = positionBook
                .decreaseCollateralFromCancelInvalidOrder(
                    _cache.order.account,
                    execFee,
                    _cache.isLong
                );

            // Approve feeRouter and collect fees
            int256[] memory _fees = new int256[](4);
            _fees[3] = int256(decreasedCollateral);
            IERC20(collateralToken).approve(address(feeRouter), feeAmount);
            feeRouter.collectFees(_cache.order.account, collateralToken, _fees);
        }

        MarketDataTypes.UpdatePositionInputs memory inputs;
        inputs._market = address(this);
        inputs._isLong = _cache.isLong;
        inputs._oraclePrice = _getPrice(true);
        inputs.isOpen = _cache.isIncrease;

        MarketLib.afterDeleteOrder(
            MarketOrderCallBackIntl.DeleteOrderEvent(
                _cache.order,
                inputs,
                uint8(
                    _cache.isExec
                        ? CancelReason.SysCancel
                        : CancelReason.Canceled
                ), //6,5
                _cache.reasonStr,
                int256(0)
            ),
            PLUGIN_GAS_LIMIT,
            plugins,
            collateralToken,
            address(this)
        );
    }
}
