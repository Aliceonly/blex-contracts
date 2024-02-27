// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../ac/Ac.sol";

interface IBLERewardTracker {
    function stakeForAccount(address acc, uint256 amount) external;

    function claimForAccount(address acc) external;

    function unstakeForAccount(address acc, uint256 amount) external;
}

/**
 * @title This contract will call each BLERewardTracker to stake, unstake, and claim.
 * @author Charlie
 */
contract BLERouter is ReentrancyGuard, Ac, ERC20 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address[] public stakePools;
    address public BLE;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) Ac(address(0)) {}

    function initialize(
        address[] memory _as,
        address ble
    ) external onlyRole(VAULT_MGR_ROLE) {
        uint256 l = stakePools.length;
        for (uint i = 0; i < l; i++) {
            stakePools.pop();
        }
        for (uint i = 0; i < _as.length; i++) {
            stakePools.push(_as[i]);
        }
        BLE = ble;
    }

    function stakeForAccount(
        address acc,
        uint256 amount
    ) external /* onlyController */ {
        ERC20(BLE).transferFrom(acc, address(this), amount);
        _mint(acc, stakePools.length * amount);
        for (uint i; i < stakePools.length; i++) {
            address pool = stakePools[i];
            _approve(acc, pool, amount);
            IBLERewardTracker(pool).stakeForAccount(acc, amount);
        }
    }

    function unstakeForAccount(
        address acc,
        uint256 amount
    ) external /* onlyController */ {
        for (uint i = 0; i < stakePools.length; i++) {
            address pool = stakePools[i];
            IBLERewardTracker(pool).unstakeForAccount(acc, amount);
        }
        _burn(acc, stakePools.length * amount);
    }

    function claimForAccount(address account) external /* onlyController */ {
        for (uint i = 0; i < stakePools.length; i++) {
            address pool = stakePools[i];
            IBLERewardTracker(pool).claimForAccount(account);
        }
    }
}
