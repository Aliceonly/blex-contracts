// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {TradeVolume} from "../TradeVolume.sol";

interface ITradePlugin {
    function updateReward(address acc) external;
}
