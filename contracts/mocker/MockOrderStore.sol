// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;


contract  MockOrderStore{
    

    function orderNum(address account)external pure returns(uint256){
        return 1;
    }

    function containsKey(bytes32 key) external view returns (bool) {
        return true;
    }

}