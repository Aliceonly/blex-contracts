// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./PositionStruct.sol";
import "./PositionStore.sol";
import "../ac/Ac.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract PositionBook is Ac {
    using Position for Position.Props;
    using SafeCast for uint256;
    using SafeCast for int256;
    uint256 public constant MIN_GLOBAL_AVG_PRICE = 100;
    address public market;

    PositionStore public longStore;

    PositionStore public shortStore;

    constructor(address factory) Ac(factory) {
        longStore = new PositionStore(factory, true);
        shortStore = new PositionStore(factory, false);
        _disableInitializers();
    }

    function initialize(address marketAddr) external initializer {
        require(marketAddr != address(0), "invalid market address");
        market = marketAddr;

        _grantRole(ROLE_CONTROLLER, marketAddr);
    }

    /**
     * @dev Called by `Market`.Returns the total size of the long and short positions in the market.
     * @return A tuple containing two unsigned integers representing the total size of the long and short positions, respectively.
     * The first element of the tuple is the size of the long positions and the second element is the size of the short positions.
     * Note that this function can be called externally and does not modify the state of the contract.
     */
    function getMarketSizes() external view returns (uint256, uint256) {
        return (longStore.globalSize(), shortStore.globalSize());
    }

    function getAccountSize(
        address account
    ) external view returns (uint256, uint256) {
        Position.Props memory _longPosition = _getPosition(account, true);
        Position.Props memory _shortPosition = _getPosition(account, false);

        return (_longPosition.size, _shortPosition.size);
    }

    function getPosition(
        address account,
        uint256 markPrice,
        bool isLong
    ) external view returns (Position.Props memory) {
        Position.Props memory _position = _getPositionData(
            account,
            markPrice,
            isLong
        );
        return _position;
    }

    function getPositions(
        address account
    ) external view returns (Position.Props[] memory) {
        Position.Props memory _long = _getPositionData(account, 0, true);
        Position.Props memory _short = _getPositionData(account, 0, false);

        uint256 _index = 0;
        if (_long.size > 0) {
            _index++;
        }
        if (_short.size > 0) {
            _index++;
        }

        Position.Props[] memory _result = new Position.Props[](_index);
        if (_index > 0) {
            _index = 0;
            if (_long.size > 0) {
                _result[_index] = _long;
                _index++;
            }
            if (_short.size > 0) {
                _result[_index] = _short;
            }
        }
        return _result;
    }

    function getPositionKeys(
        uint256 start,
        uint256 end,
        bool isLong
    ) external view returns (address[] memory) {
        require(end >= start, "positionBook: invalid range params");

        PositionStore _store = isLong ? longStore : shortStore;
        return _getPositionKeys(_store, start, end);
    }

    function getPositionCount(bool isLong) external view returns (uint256) {
        PositionStore _store = isLong ? longStore : shortStore;
        return _store.getPositionCount();
    }

    function getPNL(
        address account,
        uint256 sizeDelta,
        uint256 markPrice,
        bool isLong
    ) external view returns (int256) {
        Position.Props memory _position = _getPosition(account, isLong);
        if (_position.size == 0) {
            return 0;
        }

        (bool _hasProfit, uint256 _pnl) = _getPNL(_position, markPrice);

        if (sizeDelta != 0) {
            _pnl = (sizeDelta * _pnl) / _position.size;
        }

        return _hasProfit ? int256(_pnl) : -int256(_pnl);
    }

    function getMarketPNL(uint256 longPrice, uint256 shortPrice) external view returns (int256) {
        int256 _totalPNL = _getMarketPNL(longPrice, true);
        _totalPNL += _getMarketPNL(shortPrice, false);

        return _totalPNL;
    }

    /**
     * @dev Called by `Market`.Increases the position of an account in the specified market.
     * @param account The account address.
     * @param collateralDelta The change in collateral.
     * @param sizeDelta The change in position size.
     * @param markPrice The current mark price of the market.
     * @param fundingRate The funding rate of the market.
     * @param isLong Whether the position is long or short.
     * @return result The updated position properties.
     */
    function increasePosition(
        address account,
        int256 collateralDelta,
        uint256 sizeDelta,
        uint256 markPrice,
        int256 fundingRate,
        bool isLong
    ) external onlyController returns (Position.Props memory result) {
        Position.Props memory _position = _getPosition(account, isLong);
        if (_position.size == 0) _position.averagePrice = markPrice;

        if (_position.size > 0 && sizeDelta > 0) {
            (bool _hasProfit, uint256 _realisedPnl) = _getPNL(
                _position,
                markPrice
            );

            _position.averagePrice = _position.calAveragePrice(
                sizeDelta,
                markPrice,
                _realisedPnl,
                _hasProfit
            );

            int256 _pnl = _hasProfit
                ? int256(_realisedPnl)
                : -int256(_realisedPnl);

            result.realisedPnl = _pnl;
            result.averagePrice = _position.averagePrice;
        }

        _position.collateral = (_position.collateral.toInt256() +
            collateralDelta).toUint256();
        _position.entryFundingRate = fundingRate;
        _position.size = _position.size + sizeDelta;
        _position.isLong = isLong;
        _position.lastTime = uint32(block.timestamp);

        require(_position.isValid(), "positionBook: invalid position");

        _updatePosition(
            account,
            isLong,
            collateralDelta,
            sizeDelta,
            markPrice,
            true,
            _position
        );

        result.size = _position.size;
        result.collateral = _position.collateral;
    }

    /**
     * @dev Called by `Market`.Decreases the position of an account in the specified market.
     * @param account The account address.
     * @param collateralDelta The change in collateral.
     * @param sizeDelta The change in position size.
     * @param fundingRate The funding rate of the market.
     * @param isLong Whether the position is long or short.
     * @return result The updated position properties.
     */
    function decreasePosition(
        address account,
        uint256 collateralDelta,
        uint256 sizeDelta,
        int256 fundingRate,
        bool isLong
    ) external onlyController returns (Position.Props memory result) {
        return
            _decreasePosition(
                account,
                collateralDelta,
                sizeDelta,
                fundingRate,
                isLong
            );
    }

    /**
     * @dev Called by `Market`.Decreases the collateral of an account's position due to the cancellation of an invalid order.
     * @param account The account address.
     * @param collateralDelta The change in collateral.
     * @param isLong Whether the position is long or short.
     * @return The remaining collateral after decreasing the position.
     */
    function decreaseCollateralFromCancelInvalidOrder(
        address account,
        uint256 collateralDelta,
        bool isLong
    ) external onlyController returns (uint256) {
        Position.Props memory _position = _getPosition(account, isLong);
        if (collateralDelta > _position.collateral) {
            collateralDelta = _position.collateral;
        }

        Position.Props memory _result;
        _result = _decreasePosition(
            account,
            collateralDelta,
            0,
            _position.entryFundingRate,
            isLong
        );

        return _position.collateral - _result.collateral;
    }

    /**
     * @dev Called by `Market`.Liquidates the position of an account in the specified market.
     * @param account The account address.
     * @param markPrice The current mark price of the market.
     * @param isLong Whether the position is long or short.
     * @return result The liquidated position properties.
     */
    function liquidatePosition(
        address account,
        uint256 markPrice,
        bool isLong
    ) external onlyController returns (Position.Props memory result) {
        Position.Props memory _position = _getPosition(account, isLong);
        require(_position.isExist(), "positionBook: position does not exist");

        if (markPrice != 0) {
            (bool _hasProfit, uint256 _realisedPnl) = _getPNL(
                _position,
                markPrice
            );
            int256 _pnl = _hasProfit
                ? int256(_realisedPnl)
                : -int256(_realisedPnl);

            result.realisedPnl = _pnl;
        }

        _delPosition(account, _position.collateral, _position.size, isLong);

        result.size = _position.size;
        result.collateral = _position.collateral;
    }

    /**
     * @dev Decreases the position of an account in the specified market.
     * @param account The account address.
     * @param collateralDelta The change in collateral.
     * @param sizeDelta The change in position size.
     * @param fundingRate The funding rate of the market.
     * @param isLong Whether the position is long or short.
     * @return result The updated position properties.
     */
    function _decreasePosition(
        address account,
        uint256 collateralDelta,
        uint256 sizeDelta,
        int256 fundingRate,
        bool isLong
    ) private returns (Position.Props memory result) {
        Position.Props memory _position = _getPosition(account, isLong);
        // require(_position.lastTime != uint32(block.timestamp), "pb:same block");
        require(_position.isValid(), "positionBook: invalid position");
        require(
            _position.collateral >= collateralDelta,
            "positionBook: invalid collateral"
        );
        require(_position.size >= sizeDelta, "positionBook: invalid size");

        if (_position.size != sizeDelta) {
            _position.entryFundingRate = fundingRate;
            _position.size = _position.size - sizeDelta;
            _position.collateral = _position.collateral - collateralDelta;

            require(_position.isValid(), "positionBook: invalid position");

            _updatePosition(
                account,
                isLong,
                collateralDelta.toInt256(),
                sizeDelta,
                0,
                false,
                _position
            );

            result.size = _position.size;
            result.collateral = _position.collateral;
        } else {
            _delPosition(account, collateralDelta, sizeDelta, isLong);
        }
    }

    /**
     * @dev Retrieves the position of an account in the specified market.
     * @param account The account address.
     * @param isLong Whether the position is long or short.
     * @return position The position properties.
     */
    function _getPosition(
        address account,
        bool isLong
    ) private view returns (Position.Props memory) {
        PositionStore _store = isLong ? longStore : shortStore;
        return _store.get(account);
    }

    /**
     * @dev Retrieves the position data of an account in the specified market.
     * @param account The account address.
     * @param markPrice The current mark price of the market.
     * @param isLong Whether the position is long or short.
     * @return position The position properties with updated data.
     */
    function _getPositionData(
        address account,
        uint256 markPrice,
        bool isLong
    ) private view returns (Position.Props memory) {
        Position.Props memory _position = _getPosition(account, isLong);

        if (markPrice == 0) {
            return _position;
        }

        if (_position.size != 0) {
            (bool _hasProfit, uint256 _realisedPnl) = _getPNL(
                _position,
                markPrice
            );

            int256 _pnl = _hasProfit
                ? int256(_realisedPnl)
                : -int256(_realisedPnl);
            _position.realisedPnl = _pnl;
        }

        return _position;
    }

    /**
     * @dev Retrieves the position keys within the specified range from the given PositionStore.
     * @param store The PositionStore to retrieve position keys from.
     * @param start The starting index of the range.
     * @param end The ending index of the range.
     * @return positionKeys An array of position keys within the specified range.
     */
    function _getPositionKeys(
        PositionStore store,
        uint256 start,
        uint256 end
    ) private view returns (address[] memory) {
        uint256 _len = store.getPositionCount();
        if (_len == 0) {
            return new address[](0);
        }

        if (end > _len) {
            end = _len;
        }
        return store.getPositionKeys(start, end);
    }

    /**
     * @dev Calculates the profit and loss (PNL) of a given position at the specified mark price.
     * @param position The position for which to calculate the PNL.
     * @param markPrice The mark price used for PNL calculation.
     * @return hasProfit A boolean indicating whether the position has a profit.
     * @return pnl The realized PNL (profit and loss) of the position.
     */
    function _getPNL(
        Position.Props memory position,
        uint256 markPrice
    ) private pure returns (bool, uint256) {
        bool _hasProfit;
        uint256 _realisedPnl;

        (_hasProfit, _realisedPnl) = position.getPNL(markPrice);

        return (_hasProfit, _realisedPnl);
    }

    /**
     * @dev Calculates the total profit and loss (PNL) of the entire market at the specified mark price.
     * @param markPrice The mark price used for PNL calculation.
     * @param isLong Whether to calculate the PNL for long positions or short positions.
     * @return marketPNL The total PNL of the market for the specified position type (long or short).
     */
    function _getMarketPNL(
        uint256 markPrice,
        bool isLong
    ) private view returns (int256) {
        Position.Props memory _position = _getGlobalPosition(isLong);

        if (_position.size == 0) {
            return 0;
        }

        (bool _hasProfit, uint256 _pnl) = _getPNL(_position, markPrice);
        return _hasProfit ? int256(_pnl) : -int256(_pnl);
    }

    /**
     * @dev Calculates the updated global position based on the provided changes in collateral, size, mark price, and position type.
     * @param collateralDelta The change in collateral value.
     * @param sizeDelta The change in position size.
     * @param markPrice The mark price used for average price calculation.
     * @param isLong Whether the position is long or short.
     * @param isOpen Whether the position is being opened or closed.
     * @return position The updated global position.
     */
    function _calGlobalPosition(
        int256 collateralDelta,
        uint256 sizeDelta,
        uint256 markPrice,
        bool isLong,
        bool isOpen
    ) private view returns (Position.Props memory) {
        Position.Props memory _position = _getGlobalPosition(isLong);

        if (isOpen) {
            uint256 _averagePrice = _getGlobalAveragePrice(
                _position,
                sizeDelta,
                markPrice
            );
            require(_averagePrice > MIN_GLOBAL_AVG_PRICE, "pb:invalid global position");
            _position.averagePrice = _averagePrice;
            _position.size += sizeDelta;
            _position.collateral = (_position.collateral.toInt256() +
                collateralDelta).toUint256();
            _position.isLong = isLong;
            _position.lastTime = uint32(block.timestamp);

            return _position;
        }

        _position.size -= sizeDelta;
        _position.collateral -= collateralDelta.toUint256();

        return _position;
    }

    /**
     * @dev Calculates the global average price based on the provided position, size delta, and mark price.
     * @param position The position for which to calculate the average price.
     * @param sizeDelta The change in position size.
     * @param markPrice The mark price used for average price calculation.
     * @return averagePrice The updated average price of the position.
     */
    function _getGlobalAveragePrice(
        Position.Props memory position,
        uint256 sizeDelta,
        uint256 markPrice
    ) private pure returns (uint256) {
        if (position.size == 0) {
            return markPrice;
        }
        if (position.size > 0 && sizeDelta > 0) {
            (bool _hasProfit, uint256 _pnl) = _getPNL(position, markPrice);
            position.averagePrice = position.calAveragePrice(
                sizeDelta,
                markPrice,
                _pnl,
                _hasProfit
            );
        }

        return position.averagePrice;
    }

    /**
     * @dev Retrieves the global position for the specified position type (long or short).
     * @param isLong Whether to retrieve the global position for long or short positions.
     * @return position The global position for the specified position type.
     */
    function _getGlobalPosition(
        bool isLong
    ) private view returns (Position.Props memory) {
        PositionStore _store = isLong ? longStore : shortStore;
        return _store.getGlobalPosition();
    }

    /**
     * @dev Updates the position for the specified account and position type (long or short).
     * @param account The address of the account for which to update the position.
     * @param isLong Whether the position is long or short.
     * @param collateralDelta The change in collateral value.
     * @param sizeDelta The change in position size.
     * @param markPrice The mark price used for calculations.
     * @param isOpen Whether the position is being opened or closed.
     * @param position The position to update.
     */
    function _updatePosition(
        address account,
        bool isLong,
        int256 collateralDelta,
        uint256 sizeDelta,
        uint256 markPrice,
        bool isOpen,
        Position.Props memory position
    ) private {
        Position.Props memory _globalPosition = _calGlobalPosition(
            collateralDelta,
            sizeDelta,
            markPrice,
            isLong,
            isOpen
        );

        PositionStore _store = isLong ? longStore : shortStore;
        _store.set(account, position, _globalPosition);
    }

    /**
     * @dev Removes the position for the specified account and position type (long or short).
     * @param account The address of the account for which to remove the position.
     * @param collateralDelta The change in collateral value.
     * @param sizeDelta The change in position size.
     * @param isLong Whether the position is long or short.
     */
    function _delPosition(
        address account,
        uint256 collateralDelta,
        uint256 sizeDelta,
        bool isLong
    ) private {
        Position.Props memory _globalPosition = _calGlobalPosition(
            collateralDelta.toInt256(),
            sizeDelta,
            0,
            isLong,
            false
        );

        PositionStore _store = isLong ? longStore : shortStore;
        _store.remove(account, _globalPosition);
    }
}
