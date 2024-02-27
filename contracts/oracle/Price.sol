// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IChainPriceFeed.sol";
import "./interfaces/IGmxPriceFeed.sol";
import "./interfaces/IFastPriceFeed.sol";
import "../ac/Ac.sol";

contract Price is Ac {
    uint256 public constant PRICE_PRECISION = 10 ** 30;
    uint256 public constant ONE_USD = PRICE_PRECISION;
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    uint256 public constant MAX_SPREAD_BASIS_POINTS = 50;
    uint256 public constant MAX_ADJUSTMENT_INTERVAL = 2 hours;
    uint256 public constant MAX_ADJUSTMENT_BASIS_POINTS = 20;

    uint256 public maxStrictPriceDeviation = 0;
    uint256 public spreadThresholdBasisPoints = 30;

    bool public isFastPriceEnabled;
    bool public isGmxPriceEnabled;
    address public fastPriceFeed;
    address public chainPriceFeed;
    address public gmxPriceFeed;

    mapping(address => uint256) public spreadBasisPoints;
    // Chainlink can return prices for stablecoins
    // that differs from 1 USD by a larger percentage than stableSwapFeeBasisPoints
    // we use strictStableTokens to cap the price to 1 USD
    // this allows us to configure stablecoins like DAI as being a stableToken
    // while not being a strictStableToken
    mapping(address => bool) public strictStableTokens;

    mapping(address => uint256) public adjustmentBasisPoints;
    mapping(address => bool) public isAdjustmentAdditive;
    mapping(address => uint256) public lastAdjustmentTimings;

    constructor() Ac(msg.sender) {}

    event SetAdjustment(address _token, bool _isAdditive, uint256 _adjustmentBps, uint256 time);

    function setAdjustment(
        address _token,
        bool _isAdditive,
        uint256 _adjustmentBps
    ) external onlyInitOr(MANAGER_ROLE) {
        require(
            lastAdjustmentTimings[_token] + MAX_ADJUSTMENT_INTERVAL <
            block.timestamp,
            "PriceFeed: adjustment frequency exceeded"
        );
        require(
            _adjustmentBps <= MAX_ADJUSTMENT_BASIS_POINTS,
            "invalid _adjustmentBps"
        );
        isAdjustmentAdditive[_token] = _isAdditive;
        adjustmentBasisPoints[_token] = _adjustmentBps;
        lastAdjustmentTimings[_token] = block.timestamp;

        emit SetAdjustment(_token, _isAdditive, _adjustmentBps, block.timestamp);
    }

    event SetFastPriceEnabled(bool _isEnabled);

    function setFastPriceEnabled(
        bool _isEnabled
    ) external onlyInitOr(MANAGER_ROLE) {
        isFastPriceEnabled = _isEnabled;

        emit SetFastPriceEnabled(_isEnabled);
    }

    event SetGmxPriceFeed(address feed);

    function setGmxPriceFeed(address feed) external onlyInitOr(MANAGER_ROLE) {
        require(feed != address(0), "invalid feed");
        gmxPriceFeed = feed;

        emit SetGmxPriceFeed(feed);
    }

    event SetFastPriceFeed(address _feed);

    function setFastPriceFeed(address _feed) external onlyInitOr(MANAGER_ROLE) {
        require(_feed != address(0), "invalid feed");
        fastPriceFeed = _feed;
        emit SetFastPriceFeed(_feed);
    }

    event SetChainPriceFeed(address _feed);

    function setChainPriceFeed(
        address _feed
    ) external onlyInitOr(MANAGER_ROLE) {
        require(_feed != address(0), "invalid feed");
        chainPriceFeed = _feed;
        emit SetChainPriceFeed(_feed);
    }

    event SetIsGmxPriceEnabled(bool enable);

    function setIsGmxPriceEnabled(
        bool enable
    ) external onlyInitOr(MANAGER_ROLE) {
        isGmxPriceEnabled = enable;
        emit SetIsGmxPriceEnabled(enable);
    }

    event SetSpreadBasisPoints(address _token, uint256 _spreadBasisPoints);

    function setSpreadBasisPoints(
        address _token,
        uint256 _spreadBasisPoints
    ) external onlyInitOr(MANAGER_ROLE) {
        require(
            _spreadBasisPoints <= MAX_SPREAD_BASIS_POINTS,
            "PriceFeed: invalid _spreadBasisPoints"
        );
        spreadBasisPoints[_token] = _spreadBasisPoints;

        emit SetSpreadBasisPoints(_token, _spreadBasisPoints);
    }

    event SetMaxStrictPriceDeviation(uint256 _maxStrictPriceDeviation);

    function setMaxStrictPriceDeviation(
        uint256 _maxStrictPriceDeviation
    ) external onlyInitOr(MANAGER_ROLE) {
        maxStrictPriceDeviation = _maxStrictPriceDeviation;

        emit SetMaxStrictPriceDeviation(_maxStrictPriceDeviation);
    }

    event SetStableTokens(address _token, bool _stable);

    function setStableTokens(
        address _token,
        bool _stable
    ) external onlyInitOr(MANAGER_ROLE) {
        strictStableTokens[_token] = _stable;

        emit SetStableTokens(_token, _stable);
    }

    function getPrice(
        address _token,
        bool _maximise
    ) public view returns (uint256) {
        uint256 price = _getPrice(_token, _maximise);

        uint256 adjustmentBps = adjustmentBasisPoints[_token];

        if (adjustmentBps > 0) {
            if (isAdjustmentAdditive[_token]) {
                return
                    (price * (BASIS_POINTS_DIVISOR + adjustmentBps)) /
                    BASIS_POINTS_DIVISOR;
            }
            return
                (price * (BASIS_POINTS_DIVISOR - adjustmentBps)) /
                BASIS_POINTS_DIVISOR;
        }
        return price;
    }

    function _getPrice(
        address _token,
        bool _maximise
    ) internal view returns (uint256) {
        uint256 price = getChainPrice(_token, _maximise);

        if (isFastPriceEnabled) {
            price = getFastPrice(_token, price, _maximise);
        }

        if (isGmxPriceEnabled) {
            uint256 _gmxPrice = getGmxPrice(_token, _maximise);
            // get the higher of the two prices
            if (_maximise && _gmxPrice > price) {
                price = _gmxPrice;
            }
            // get the lower of the two prices
            if (!_maximise && price > _gmxPrice) {
                price = _gmxPrice;
            }
        }

        if (strictStableTokens[_token]) {
            uint256 delta = price > ONE_USD ? price - ONE_USD : ONE_USD - price;
            if (delta <= maxStrictPriceDeviation) {
                return ONE_USD;
            }

            // if _maximise and price is e.g. 1.02, return 1.02
            if (_maximise && price > ONE_USD) {
                return price;
            }

            // if !_maximise and price is e.g. 0.98, return 0.98
            if (!_maximise && price < ONE_USD) {
                return price;
            }

            return ONE_USD;
        }

        uint256 _spreadBasisPoints = spreadBasisPoints[_token];

        if (_maximise) {
            return
                (price * (BASIS_POINTS_DIVISOR + _spreadBasisPoints)) /
                BASIS_POINTS_DIVISOR;
        }
        return
            (price * (BASIS_POINTS_DIVISOR - _spreadBasisPoints)) /
            BASIS_POINTS_DIVISOR;
    }

    function getChainPrice(
        address _token,
        bool _maximise
    ) public view returns (uint256) {
        require(chainPriceFeed != address(0), "chainPriceFeed zero");

        return IChainPriceFeed(chainPriceFeed).getPrice(_token, _maximise);
    }

    function getFastPrice(
        address _token,
        uint256 _referencePrice,
        bool _maximise
    ) public view returns (uint256) {
        if (fastPriceFeed == address(0)) {
            return _referencePrice;
        }
        return
            IFastPriceFeed(fastPriceFeed).getPrice(
            _token,
            _referencePrice,
            _maximise
        );
    }

    function getGmxPrice(
        address _token,
        bool _maximise
    ) public view returns (uint256) {
        return
            IGmxPriceFeed(gmxPriceFeed).getPrice(
            _token,
            _maximise,
            false,
            false
        );
    }
}
