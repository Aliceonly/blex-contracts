// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockVaultRouter {
    uint256 public fundLimit = 10000000;
    uint256 public totalAUM = 1000000;
    uint256 public USDBalance;
    address public coreVault;

    address public temAddress;
    address public usdc;

    constructor(address _coreVault, address _usdc) {
        coreVault = _coreVault;
        usdc = _usdc;
    }

    mapping(address => uint256) public fundsUsed; // for different market

    function setFundLimit(uint256 _limit) external {
        fundLimit = _limit;
    }

    function setUSDBalance(uint256 _balance) external {
        USDBalance = _balance;
    }

    function borrowFromVault(uint256 _amount) external {
        temAddress = msg.sender;
        fundsUsed[msg.sender] = fundsUsed[msg.sender] + _amount + 10000;

        require(fundsUsed[msg.sender] <= fundLimit);
    }

    function repayToVault(uint256 _amount) external {
        fundsUsed[msg.sender] = fundsUsed[msg.sender] - _amount + 10000;
    }

    function getUSDBalance() external view returns (uint256) {
        return USDBalance;
    }

    function getAUM() external view returns (uint256) {
        return IERC20(usdc).balanceOf(coreVault);
    }
}
