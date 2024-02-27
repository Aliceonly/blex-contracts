// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./MintableBaseToken.sol";

contract BPT is MintableBaseToken {
    constructor() MintableBaseToken("BLEX Point", "BPT", 0) {}

    function id() external pure returns (string memory _name) {
        return "BPT";
    }
}
