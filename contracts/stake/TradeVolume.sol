// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../ac/AcUpgradable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/ITradePlugin.sol";
import "./interfaces/ITradeVolume.sol";

import {MarketPositionCallBackIntl, MarketOrderCallBackIntl, MarketCallBackIntl} from "../market/interfaces/IMarketCallBackIntl.sol";

/**
 * @title Track the trading volume of users.
 * @author
 */
contract TradeVolume is AcUpgradable, MarketPositionCallBackIntl {
    using SafeCast for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet plugins;
    mapping(address => ITradeVolume.User) public users;
    mapping(uint256 => uint256) public dailyVolumes;

    function initialize() external initializer {
        AcUpgradable._initialize(msg.sender);
    }

    function lastDailyVolume(address acc) external view returns (uint256) {
        return dailyVolumes[users[acc].lastTransactionTime];
    }

    function addPlugin(address _plugin) external onlyRole(VAULT_MGR_ROLE) {
        plugins.add(_plugin);
    }

    function removePlugin(address _plugin) external onlyRole(VAULT_MGR_ROLE) {
        plugins.remove(_plugin);
    }

    function updatePositionCallback(
        UpdatePositionEvent memory _event
    ) external override /* onlyController */ {
        address acc = _event.inputs._account;
        for (uint i = 0; i < plugins.length(); i++) {
            ITradePlugin p = ITradePlugin(plugins.at(i));
            try p.updateReward(acc) {} catch {}
        }
        //==================================
        //       _afterVolumeUpdated
        //==================================
        uint256 volume = _event.inputs._sizeDelta;
        ITradeVolume.User memory _user = users[acc];
        uint256 _currentDay = getCurrentDay();
        if (_currentDay > _user.lastTransactionTime) {
            _user.lastTransactionTime = uint32(_currentDay);
            _user.accumulatedVolume = 0;
        }
        _user.accumulatedVolume += volume.toUint128();
        users[acc] = _user;
        dailyVolumes[_currentDay] += volume;
    }

    function setVolume(
        uint256 day,
        uint256 _v
    ) external onlyRole(VAULT_MGR_ROLE) {
        dailyVolumes[day] = _v;
    }

    function getCurrentDay() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function getHooksCalls()
        external
        pure
        override
        returns (MarketCallBackIntl.Calls memory)
    {
        return
            MarketCallBackIntl.Calls({
                updatePosition: true,
                updateOrder: false,
                deleteOrder: false
            });
    }

    uint256[50] private ______gap;
}
