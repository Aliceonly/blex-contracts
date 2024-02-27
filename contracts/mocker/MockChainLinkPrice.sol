// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IPriceFeed} from "../oracle/interfaces/IPriceFeed.sol";
import "hardhat/console.sol";

contract MockChainLinkPrice is IPriceFeed {
    int256 public s_answer;
    uint8 public s_decimals;
    uint80 public s_round;
    uint256 public s_timestamp;

    function setRound(uint80 round) public {
        s_round = round;
    }

    function getRound() public view returns (uint80) {
        return s_round;
    }

    function setLatestAnswer(int256 answer) public {
        console.log("-------------set---------123---", uint256(answer));
        s_answer = answer;
    }

    function latestAnswer() public view override returns (int256) {
        console.log("-------------get------------");
        return s_answer;
    }

    function aggregator() external view returns (address) {
        return address(this);
    }

    function setDecimals(uint8 decimals_) public {
        s_decimals = decimals_;
    }

    function decimals() external view returns (uint8) {
        return s_decimals;
    }

    function setTimestamp(uint256 timestamp_) public {
        s_timestamp = timestamp_;
    }

    function latestTimestamp() external view returns (uint256) {
        return s_timestamp;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, s_answer, 0, s_timestamp, 0);
    }

    /// Not implemented but required by interface

    function latestRound() external view override returns (uint80) {
        console.log("start latestRound");
        return s_round;
    }

    function description() external view override returns (string memory) {}

    function version() external view returns (uint256) {}

    function getRoundData(
        uint80 _roundId
    )
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, s_answer, 0, s_timestamp, 0);
    }
}
