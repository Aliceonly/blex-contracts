// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IChainPriceFeed.sol";
import {IMarket} from "../market/interfaces/IMarket.sol";
import "../ac/Ac.sol";
import "../order/interface/IOrderStore.sol";
import "../market/MarketDataTypes.sol";
import {OrderLib} from "../order/OrderLib.sol";

contract FastPriceFeed is Ac {
    using MarketDataTypes for MarketDataTypes.UpdatePositionInputs;

    // fit data in a uint256 slot to save gas costs
    struct PriceDataItem {
        uint160 refPrice; // Chainlink price
        uint32 refTime; // last updated at time
        uint32 cumulativeRefDelta; // cumulative Chainlink price delta
        uint32 cumulativeFastDelta; // cumulative fast price delta
    }

    uint256 public constant PRICE_PRECISION = 10 ** 30;
    uint256 public constant CUMULATIVE_DELTA_PRECISION = 10 * 1000 * 1000;
    uint256 public constant MAX_REF_PRICE = type(uint160).max;
    uint256 public constant MAX_CUMULATIVE_REF_DELTA = type(uint32).max;
    uint256 public constant MAX_CUMULATIVE_FAST_DELTA = type(uint32).max;
    // uint256(~0) is 256 bits of 1s
    // shift the 1s by (256 - 32) to get (256 - 32) 0s followed by 32 1s
    uint256 public constant BITMASK_32 = type(uint256).max >> (256 - 32);
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    uint256 public constant MAX_PRICE_DURATION = 30 minutes;

    bool public isSpreadEnablede;

    address public chainPriceFeed;

    uint256 public lastUpdatedAt;
    uint256 public lastUpdatedBlock;

    uint256 public priceDuration;
    uint256 public maxPriceUpdateDelay;
    uint256 public spreadBasisPointsIfInactive;
    uint256 public spreadBasisPointsIfChainError;
    uint256 public minBlockInterval;
    uint256 public maxTimeDeviation;

    uint256 public priceDataInterval;

    // allowed deviation from primary price
    uint256 public maxDeviationBasisPoints;

    mapping(address => uint256) public prices;
    mapping(address => PriceDataItem) public priceData;
    mapping(address => uint256) public maxCumulativeDeltaDiffs;

    // array of tokens used in setCompactedPrices, saves L1 calldata gas costs
    address[] public tokens;
    // array of tokenPrecisions used in setCompactedPrices, saves L1 calldata gas costs
    // if the token price will be sent with 3 decimals, then tokenPrecision for that token
    // should be 10 ** 3
    uint256[] public tokenPrecisions;

    event PriceData(
        address token,
        uint256 refPrice,
        uint256 fastPrice,
        uint256 cumulativeRefDelta,
        uint256 cumulativeFastDelta
    );
    event MaxCumulativeDeltaDiffExceeded(
        address token,
        uint256 refPrice,
        uint256 fastPrice,
        uint256 cumulativeRefDelta,
        uint256 cumulativeFastDelta
    );
    event UpdatePrice(address feed, address indexed token, uint256 price);

    constructor(
        uint256 _priceDuration, // 300
        uint256 _maxPriceUpdateDelay, // 3600
        uint256 _minBlockInterval, // 0
        uint256 _maxDeviationBasisPoints // 1000
    ) Ac(msg.sender) {
        require(
            _priceDuration <= MAX_PRICE_DURATION,
            "FastPriceFeed: invalid _priceDuration"
        );
        priceDuration = _priceDuration;
        maxPriceUpdateDelay = _maxPriceUpdateDelay;
        minBlockInterval = _minBlockInterval;
        maxDeviationBasisPoints = _maxDeviationBasisPoints;
    }

    event SetPriceFeed(address _feed);

    function setPriceFeed(address _feed) external onlyInitOr(MANAGER_ROLE) {
        require(_feed != address(0), "invalid feed");
        chainPriceFeed = _feed;

        emit SetPriceFeed(_feed);
    }

    event SetMaxTimeDeviation(uint256 _deviation);

    function setMaxTimeDeviation(
        uint256 _deviation
    ) external onlyInitOr(MANAGER_ROLE) {
        maxTimeDeviation = _deviation;
        emit SetMaxTimeDeviation(_deviation);
    }

    event SetPriceDuration(uint256 _duration);

    function setPriceDuration(
        uint256 _duration
    ) external onlyInitOr(MANAGER_ROLE) {
        require(
            _duration <= MAX_PRICE_DURATION,
            "FastPriceFeed: invalid priceDuration"
        );
        priceDuration = _duration;

        emit SetPriceDuration(_duration);
    }

    event SetMaxPriceUpdateDelay(uint256 _delay);

    function setMaxPriceUpdateDelay(
        uint256 _delay
    ) external onlyInitOr(MANAGER_ROLE) {
        maxPriceUpdateDelay = _delay;

        emit SetMaxPriceUpdateDelay(_delay);
    }

    event SetSpreadBasisPointsIfInactive(uint256 _point);

    function setSpreadBasisPointsIfInactive(
        uint256 _point
    ) external onlyInitOr(MANAGER_ROLE) {
        spreadBasisPointsIfInactive = _point;

        emit SetSpreadBasisPointsIfInactive(_point);
    }

    event SetSpreadBasisPointsIfChainError(uint256 _point);

    function setSpreadBasisPointsIfChainError(
        uint256 _point
    ) external onlyInitOr(MANAGER_ROLE) {
        spreadBasisPointsIfChainError = _point;

        emit SetSpreadBasisPointsIfChainError(_point);
    }

    event SetMinBlockInterval(uint256 _interval);

    function setMinBlockInterval(
        uint256 _interval
    ) external onlyInitOr(MANAGER_ROLE) {
        minBlockInterval = _interval;

        emit SetMinBlockInterval(_interval);
    }

    event SetIsSpreadEnabled(bool _enabled);

    function setIsSpreadEnabled(
        bool _enabled
    ) external onlyInitOr(MANAGER_ROLE) {
        isSpreadEnablede = _enabled;

        emit SetIsSpreadEnabled(_enabled);
    }

    event SetLastUpdatedAt(uint256 _lastUpdatedAt);

    function setLastUpdatedAt(
        uint256 _lastUpdatedAt
    ) external onlyInitOr(MANAGER_ROLE) {
        lastUpdatedAt = _lastUpdatedAt;
        emit SetLastUpdatedAt(_lastUpdatedAt);
    }

    event SetMaxDeviationBasisPoints(uint256 _maxDeviationBasisPoints);

    function setMaxDeviationBasisPoints(
        uint256 _maxDeviationBasisPoints
    ) external onlyInitOr(MANAGER_ROLE) {
        maxDeviationBasisPoints = _maxDeviationBasisPoints;

        emit SetMaxDeviationBasisPoints(_maxDeviationBasisPoints);
    }

    event SetMaxCumulativeDeltaDiffs(
        address[] _tokens,
        uint256[] _maxCumulativeDeltaDiffs
    );

    function setMaxCumulativeDeltaDiffs(
        address[] memory _tokens,
        uint256[] memory _maxCumulativeDeltaDiffs
    ) external onlyInitOr(MANAGER_ROLE) {
        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            maxCumulativeDeltaDiffs[token] = _maxCumulativeDeltaDiffs[i];
        }
        emit SetMaxCumulativeDeltaDiffs(_tokens, _maxCumulativeDeltaDiffs);
    }

    event SetPriceDataInterval(uint256 _priceDataInterval);

    function setPriceDataInterval(
        uint256 _priceDataInterval
    ) external onlyInitOr(MANAGER_ROLE) {
        priceDataInterval = _priceDataInterval;

        emit SetPriceDataInterval(_priceDataInterval);
    }

    event SetTokens(address[] _tokens, uint256[] _tokenPrecisions);

    function setTokens(
        address[] memory _tokens,
        uint256[] memory _tokenPrecisions
    ) external onlyInitOr(MANAGER_ROLE) {
        require(
            _tokens.length == _tokenPrecisions.length,
            "FastPriceFeed: invalid lengths"
        );
        tokens = _tokens;
        tokenPrecisions = _tokenPrecisions;

        emit SetTokens(_tokens, _tokenPrecisions);
    }

    event SetPrices(address[] _tokens, uint256[] _prices, uint256 _timestamp);

    function setPrices(
        address[] memory _tokens,
        uint256[] memory _prices,
        uint256 _timestamp
    ) external onlyUpdater {
        bool shouldUpdate = _setLastUpdatedValues(_timestamp);

        if (shouldUpdate) {
            for (uint256 i = 0; i < _tokens.length; i++) {
                address token = _tokens[i];
                _setPrice(token, _prices[i]);
            }

            emit SetPrices(_tokens, _prices, _timestamp);
        }
    }

    event SetPricesAndExecute(
        address token,
        uint256 price,
        uint256 timestamp,
        IMarket.OrderExec[] orders
    );

    function setPricesAndExecute(
        address token,
        uint256 price,
        uint256 timestamp,
        IMarket.OrderExec[] memory orders
    ) external onlyUpdater {
        _setLastUpdatedValues(timestamp);
        _setPrice(token, price);

        for (uint256 i = 0; i < orders.length; i++) {
            IMarket _market = IMarket(orders[i].market);

            IOrderStore _store = _market.orderStore(
                orders[i].isLong,
                orders[i].isIncrease
            );
            bytes32 _key = OrderLib.getKey(
                orders[i].account,
                orders[i].orderID
            );

            Order.Props memory _order = _store.orders(_key);

            MarketDataTypes.UpdatePositionInputs memory _vars;
            _vars.initialize(orders[i].isIncrease);
            _vars.fromOrder(
                _order,
                orders[i].market,
                orders[i].isLong,
                orders[i].isIncrease,
                true
            );

            _market.execOrderKey(_order, _vars);
        }

        emit SetPricesAndExecute(token, price, timestamp, orders);
    }

    event SetCompactedPrices(uint256[] _priceBitArray, uint256 _timestamp);

    function setCompactedPrices(
        uint256[] memory _priceBitArray,
        uint256 _timestamp
    ) external onlyUpdater {
        bool shouldUpdate = _setLastUpdatedValues(_timestamp);

        if (shouldUpdate) {
            address _feed = chainPriceFeed;

            for (uint256 i = 0; i < _priceBitArray.length; i++) {
                uint256 priceBits = _priceBitArray[i];

                for (uint256 j = 0; j < 8; j++) {
                    uint256 index = i * 8 + j;
                    if (index >= tokens.length) {
                        return;
                    }

                    uint256 startBit = 32 * j;
                    uint256 price = (priceBits >> startBit) & BITMASK_32;

                    address token = tokens[i * 8 + j];
                    uint256 tokenPrecision = tokenPrecisions[i * 8 + j];
                    uint256 adjustedPrice = (price * PRICE_PRECISION) /
                        tokenPrecision;

                    _setPrice(token, adjustedPrice);
                }
            }

            emit SetCompactedPrices(_priceBitArray, _timestamp);
        }
    }

    function setPricesWithBits(
        uint256 _priceBits,
        uint256 _timestamp
    ) external onlyUpdater {
        _setPricesWithBits(_priceBits, _timestamp);
    }

    // under regular operation, the fastPrice (prices[token]) is returned and there is no spread returned from this function,
    // though VaultPriceFeed might apply its own spread
    //
    // if the fastPrice has not been updated within priceDuration then it is ignored and only _refPrice with a spread is used (spread: spreadBasisPointsIfInactive)
    // in case the fastPrice has not been updated for maxPriceUpdateDelay then the _refPrice with a larger spread is used (spread: spreadBasisPointsIfChainError)
    //
    // there will be a spread from the _refPrice to the fastPrice in the following cases:
    // - in case isSpreadEnabled is set to true
    // - in case the maxDeviationBasisPoints between _refPrice and fastPrice is exceeded
    // - in case watchers flag an issue
    // - in case the cumulativeFastDelta exceeds the cumulativeRefDelta by the maxCumulativeDeltaDiff
    function getPrice(
        address _token,
        uint256 _refPrice,
        bool _maximise
    ) external view returns (uint256) {
        if (block.timestamp > lastUpdatedAt + maxPriceUpdateDelay) {
            if (_maximise) {
                return
                    (_refPrice *
                        (BASIS_POINTS_DIVISOR +
                            spreadBasisPointsIfChainError)) /
                    BASIS_POINTS_DIVISOR;
            }

            return
                (_refPrice *
                    (BASIS_POINTS_DIVISOR - spreadBasisPointsIfChainError)) /
                (BASIS_POINTS_DIVISOR);
        }

        if (block.timestamp > lastUpdatedAt + priceDuration) {
            // 300
            if (_maximise) {
                return
                    (_refPrice *
                        (BASIS_POINTS_DIVISOR + spreadBasisPointsIfInactive)) /
                    BASIS_POINTS_DIVISOR;
            }

            return
                (_refPrice *
                    (BASIS_POINTS_DIVISOR - spreadBasisPointsIfInactive)) /
                BASIS_POINTS_DIVISOR;
        }

        uint256 fastPrice = prices[_token];
        if (fastPrice == 0) {
            return _refPrice;
        }
        //  ref price   fast price
        // 160248000000 - 160029000000 = 219000000
        uint256 diffBasisPoints = _refPrice > fastPrice
            ? _refPrice - fastPrice
            : fastPrice - _refPrice;
        // 0.002
        diffBasisPoints = (diffBasisPoints * BASIS_POINTS_DIVISOR) / _refPrice;

        // create a spread between the _refPrice and the fastPrice if the maxDeviationBasisPoints is exceeded
        // or if watchers have flagged an issue with the fast price
        bool hasSpread = !favorFastPrice(_token) ||
            diffBasisPoints > maxDeviationBasisPoints;

        if (hasSpread) {
            // return the higher of the two prices
            if (_maximise) {
                return _refPrice > fastPrice ? _refPrice : fastPrice;
            }

            // return the lower of the two prices
            return _refPrice < fastPrice ? _refPrice : fastPrice;
        }

        return fastPrice;
    }

    function favorFastPrice(address _token) public view returns (bool) {
        if (isSpreadEnablede) {
            return false;
        }

        (
            ,
            ,
            uint256 cumulativeRefDelta,
            uint256 cumulativeFastDelta
        ) = getPriceData(_token);
        if (
            cumulativeFastDelta > cumulativeRefDelta &&
            cumulativeFastDelta - cumulativeRefDelta >
            maxCumulativeDeltaDiffs[_token]
        ) {
            // force a spread if the cumulative delta for the fast price feed exceeds the cumulative delta
            // for the Chainlink price feed by the maxCumulativeDeltaDiff allowed
            return false;
        }

        return true;
    }

    function getPriceData(
        address _token
    ) public view returns (uint256, uint256, uint256, uint256) {
        PriceDataItem memory data = priceData[_token];
        return (
            uint256(data.refPrice),
            uint256(data.refTime),
            uint256(data.cumulativeRefDelta),
            uint256(data.cumulativeFastDelta)
        );
    }

    event SetPricesWithBits(uint256 _priceBits, uint256 _timestamp);

    function _setPricesWithBits(
        uint256 _priceBits,
        uint256 _timestamp
    ) private {
        bool shouldUpdate = _setLastUpdatedValues(_timestamp);

        if (shouldUpdate) {
            address[] memory _tokens = tokens;
            uint256[] memory _tokenPrecisions = tokenPrecisions;
            uint256 token_length = _tokens.length;

            for (uint256 j; j < 8; ) {
                if (j >= token_length) return;

                uint256 startBit;
                unchecked {
                    startBit = 32 * j;
                }
                uint256 price = (_priceBits >> startBit) & BITMASK_32;
                address token = _tokens[j];
                uint256 adjustedPrice = (price * PRICE_PRECISION) /
                    _tokenPrecisions[j];

                _setPrice(token, adjustedPrice);
                unchecked {
                    ++j;
                }
            }

            emit SetPricesWithBits(_priceBits, _timestamp);
        }
    }

    function _setPrice(address _token, uint256 _price) private {
        address _feed = chainPriceFeed;
        if (_feed != address(0)) {
            uint256 refPrice = IChainPriceFeed(_feed).getLatestPrice(_token);
            uint256 fastPrice = prices[_token];

            (
                uint256 prevRefPrice,
                uint256 refTime,
                uint256 cumulativeRefDelta,
                uint256 cumulativeFastDelta
            ) = getPriceData(_token);

            if (prevRefPrice > 0) {
                uint256 refDeltaAmount = refPrice > prevRefPrice
                    ? refPrice - prevRefPrice
                    : prevRefPrice - refPrice;
                uint256 fastDeltaAmount = fastPrice > _price
                    ? fastPrice - _price
                    : _price - fastPrice;

                // reset cumulative delta values if it is a new time window
                if (
                    refTime / priceDataInterval !=
                    block.timestamp / priceDataInterval
                ) {
                    cumulativeRefDelta = 0;
                    cumulativeFastDelta = 0;
                }

                cumulativeRefDelta =
                    cumulativeRefDelta +
                    (refDeltaAmount * CUMULATIVE_DELTA_PRECISION) /
                    prevRefPrice;
                cumulativeFastDelta =
                    cumulativeFastDelta +
                    (fastDeltaAmount * CUMULATIVE_DELTA_PRECISION) /
                    fastPrice;
            }

            if (
                cumulativeFastDelta > cumulativeRefDelta &&
                cumulativeFastDelta - cumulativeRefDelta >
                maxCumulativeDeltaDiffs[_token]
            ) {
                emit MaxCumulativeDeltaDiffExceeded(
                    _token,
                    refPrice,
                    fastPrice,
                    cumulativeRefDelta,
                    cumulativeFastDelta
                );
            }

            _setPriceData(
                _token,
                refPrice,
                cumulativeRefDelta,
                cumulativeFastDelta
            );
            emit PriceData(
                _token,
                refPrice,
                fastPrice,
                cumulativeRefDelta,
                cumulativeFastDelta
            );
        }

        prices[_token] = _price;
        emit UpdatePrice(msg.sender, _token, _price);
    }

    function _setPriceData(
        address _token,
        uint256 _refPrice,
        uint256 _cumulativeRefDelta,
        uint256 _cumulativeFastDelta
    ) private {
        require(_refPrice < MAX_REF_PRICE, "FastPriceFeed: invalid refPrice");
        // skip validation of block.timestamp, it should only be out of range after the year 2100
        require(
            _cumulativeRefDelta < MAX_CUMULATIVE_REF_DELTA,
            "FastPriceFeed: invalid cumulativeRefDelta"
        );
        require(
            _cumulativeFastDelta < MAX_CUMULATIVE_FAST_DELTA,
            "FastPriceFeed: invalid cumulativeFastDelta"
        );

        priceData[_token] = PriceDataItem(
            uint160(_refPrice),
            uint32(block.timestamp),
            uint32(_cumulativeRefDelta),
            uint32(_cumulativeFastDelta)
        );
    }

    event SetLastUpdatedValues(uint256 _timestamp, uint256 block);

    function _setLastUpdatedValues(uint256 _timestamp) private returns (bool) {
        if (minBlockInterval > 0) {
            require(
                block.number - lastUpdatedBlock >= minBlockInterval,
                "FastPriceFeed: minBlockInterval not yet passed"
            );
        }

        uint256 _maxTimeDeviation = maxTimeDeviation;
        require(
            _timestamp > block.timestamp - _maxTimeDeviation,
            "FastPriceFeed: _timestamp below allowed range"
        );
        require(
            _timestamp < block.timestamp + _maxTimeDeviation,
            "FastPriceFeed: _timestamp exceeds allowed range"
        );

        // do not update prices if _timestamp is before the current lastUpdatedAt value
        if (_timestamp < lastUpdatedAt) {
            return false;
        }

        lastUpdatedAt = _timestamp;
        lastUpdatedBlock = block.number;

        emit SetLastUpdatedValues(_timestamp, block.number);

        return true;
    }
}
