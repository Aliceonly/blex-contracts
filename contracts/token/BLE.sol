// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./MintableBaseToken.sol";

contract BLE is MintableBaseToken {
    constructor()
        MintableBaseToken("BLE", "BLE", 0 /* 8000 * 10000 * 10 ** 18 */)
    {}

    function id() external pure returns (string memory _name) {
        return "BLE";
    }
}
