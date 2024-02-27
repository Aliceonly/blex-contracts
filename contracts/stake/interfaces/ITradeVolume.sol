// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {TradeVolume} from "../TradeVolume.sol";

interface ITradeVolume {
    struct User {
        uint32 lastTransactionTime;
        uint128 accumulatedVolume;
        uint64 extra0;
        uint32 extra1;
    }

    function users(address) external view returns (User memory);

    function dailyVolumes(uint256) external view returns (uint256);

    function lastDailyVolume(address acc) external view returns (uint256);
}
