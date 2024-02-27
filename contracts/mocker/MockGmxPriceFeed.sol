// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../oracle/interfaces/IFastPriceFeed.sol";

contract ChainPriceFeedMock {
    mapping(address => uint256) public prices;

    function setPrice(address token, uint256 price) external {
        prices[token] = price;
    }

    function getPrice(
        address _token,
        bool _maximise,
        bool _includeAmmPrice,
        bool _useSwapPricing
    ) external view returns (uint256) {
        return prices[_token];
    }
}
