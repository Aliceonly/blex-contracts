// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IPriceFeed.sol";
import "../ac/Ac.sol";

contract ChainPriceFeed is Ac {
    uint256 public constant PRICE_PRECISION = 10 ** 30;

    uint256 public sampleSpace = 3;
    mapping(address => address) public priceFeeds;
    mapping(address => uint256) public priceDecimals;
    address public USDT;

    constructor() Ac(msg.sender) {}

    function setSampleSpace(uint256 _times) external onlyManager {
        require(_times > 0, "PriceFeed: invalid _priceSampleSpace");
        sampleSpace = _times;
    }

    function setPriceFeed(
        address _token,
        address _feed,
        uint256 _decimal
    ) external onlyInitOr(MANAGER_ROLE) {
        priceFeeds[_token] = _feed;
        priceDecimals[_token] = _decimal;
    }

    function setUSDT(
        address _token,
        address _feed,
        uint256 _decimal
    ) external onlyInitOr(MANAGER_ROLE) {
        USDT = _token;
        priceFeeds[_token] = _feed;
        priceDecimals[_token] = _decimal;
    }

    function getLatestPrice(address _token) public view returns (uint256) {
        uint256 xxxUSD = _getLatestPrice(_token);
        uint256 _USDTUSD = _getLatestPrice(USDT);
        if (xxxUSD < (2 ** 256 - 1) / PRICE_PRECISION)
            return (xxxUSD * PRICE_PRECISION) / _USDTUSD;
        return (xxxUSD / PRICE_PRECISION) * _USDTUSD;
    }

    function _getLatestPrice(address token) private view returns (uint256) {
        address feed = priceFeeds[token];
        require(feed != address(0), "PriceFeed: invalid price feed");

        (, int256 price, , , ) = IPriceFeed(feed).latestRoundData();
        require(price > 0, "PriceFeed: invalid price");

        return uint256(price);
        // return _getPrice(token, false, 1);
    }

    function getPrice(
        address token,
        bool maximise
    ) public view returns (uint256) {
        return _getPriceWithUSDT(token, maximise, uint80(sampleSpace));
    }

    function _getPriceWithUSDT(
        address _token,
        bool _maximise,
        uint80 rounds_
    ) internal view returns (uint256 finalPrice) {
        uint256 xxxUSD = _getPrice(_token, _maximise, rounds_);
        uint256 _USDTUSD = _getPrice(USDT, _maximise, rounds_);
        if (xxxUSD < (2 ** 256 - 1) / PRICE_PRECISION)
            return (xxxUSD * PRICE_PRECISION) / _USDTUSD;
        return (xxxUSD / PRICE_PRECISION) * _USDTUSD;
    }

    function _getPrice(
        address token,
        bool maximise,
        uint80 rounds_
    ) internal view returns (uint256 finalPrice) {
        address feed = priceFeeds[token];
        require(feed != address(0), "PriceFeed: invalid price feed");

        IPriceFeed priceFeed = IPriceFeed(feed);
        (uint80 roundId, int256 price, , , ) = priceFeed.latestRoundData();
        for (uint80 end = roundId-- - rounds_; roundId > end; roundId--) {
            (, int256 _price, , , ) = priceFeed.getRoundData(roundId);
            if (maximise) {
                if (_price > price) price = _price;
            } else {
                if (_price < price) price = _price;
            }
        }
        uint8 decimals = priceFeed.decimals();
        finalPrice = (uint256(price) * PRICE_PRECISION) / (10 ** decimals);

        require(finalPrice > 0, "PriceFeed: could not fetch price");
        return finalPrice;
    }
}
