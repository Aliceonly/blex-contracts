// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "../ac/AcUpgradable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {ITradePlugin} from "./interfaces/ITradePlugin.sol";
import {ITradeVolume} from "./interfaces/ITradeVolume.sol";
import {IMintable} from "./interfaces/IMintable.sol";
import {TransferHelper} from "../utils/TransferHelper.sol";

/**
 * @title Earn esBLE based on user trading volume.
 * @author
 */
contract EsBLETradeRewarder is AcUpgradable, ITradePlugin {
    using SafeCast for uint256;

    struct User {
        uint32 extra0;
        uint64 accumulatedReward;
        uint96 claimedReward;
        uint128 extra1;
    }

    mapping(address => User) public users;
    uint256 public thresholdA;
    uint256 public thresholdB;
    uint256 public constant sizeDecimals = TransferHelper.USD_DECIMALS;
    address public rewardToken;
    address public esVault;
    ITradeVolume public tradeVolumeContract;

    function initialize(
        address _tradeVolContract,
        address _esVault,
        address _rewardToken
    ) external initializer {
        AcUpgradable._initialize(msg.sender);
        tradeVolumeContract = ITradeVolume(_tradeVolContract);
        grantRole(ROLE_CONTROLLER, _tradeVolContract);
        esVault = _esVault;
        rewardToken = _rewardToken;
        thresholdA = 25000000;
        thresholdB = 5000;
    }

    function claimForAccount(address acc) external /* onlyController */ {
        _updateReward(acc);
        User storage user = users[acc];
        uint256 userRewards = user.accumulatedReward - user.claimedReward;
        user.claimedReward += userRewards.toUint96();
        IMintable(rewardToken).mint(acc, userRewards);
    }

    function updateReward(address acc) external onlyController {
        _updateReward(acc);
    }

    function _updateReward(address acc) private {
        User memory user0 = users[acc];
        ITradeVolume.User memory user1 = tradeVolumeContract.users(acc);
        uint256 _currentDay = getCurrentDay();
        if (_currentDay > user1.lastTransactionTime) {
            uint256 lastDayReward = calculateLastDayRewards(user0, user1, acc);
            user0.accumulatedReward += lastDayReward.toUint64();
            users[acc] = user0;
        }
    }

    function calculateLastDayRewards(
        User memory /* user0 */,
        ITradeVolume.User memory _user1,
        address acc
    ) internal view returns (uint256 amount) {
        uint256 baseVol = thresholdA * 10 ** sizeDecimals;
        uint256 lastDayVolume = tradeVolumeContract.lastDailyVolume(acc);
        if (lastDayVolume < baseVol)
            amount = (_user1.accumulatedVolume * thresholdB) / baseVol;
        else amount = (_user1.accumulatedVolume * thresholdB) / lastDayVolume;
    }

    function getCurrentDay() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function setThreshold(
        uint256 _a,
        uint256 _b
    ) external onlyRole(VAULT_MGR_ROLE) {
        thresholdA = _a;
        thresholdB = _b;
    }

    uint256[50] private ______gap;
}
