// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./MintableBaseToken.sol";

contract EsBLE is MintableBaseToken {
    constructor() MintableBaseToken("Escrowed BLE", "esBLE", 0) {
        // setMinter(msg.sender, true);
    }

    function id() external pure returns (string memory _name) {
        return "esBLE";
    }

    function _burn(address _account, uint256 _amount) internal override virtual{
        require(
            _account != address(0),
            "BaseToken: burn from the zero address"
        );
        balances[_account] = balances[_account] - _amount;
        balances[address(0)] = balances[address(0)] + _amount;
        emit Transfer(_account, address(0), _amount);
    }
}
