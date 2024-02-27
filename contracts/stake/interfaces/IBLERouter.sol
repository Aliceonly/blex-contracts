// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IBLERouter {
    function stakeForAccount(address account, uint256 amount) external;

    function unstakeForAccount(address account, uint256 amount) external;
}
