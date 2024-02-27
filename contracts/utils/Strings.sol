// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.17;

library StringsPlus {
    string internal constant POSITION_TRIGGER_ABOVE =
        "PositionAddMgr:triggerabove";

    function equals(
        string memory _str,
        string memory str
    ) internal pure returns (bool) {
        return
            keccak256(abi.encodePacked(_str)) ==
            keccak256(abi.encodePacked(str));
    }

    function isEmpty(string memory _str) internal pure returns (bool) {
        return (bytes(_str).length == 0);
    }
}
