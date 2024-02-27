// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;

import "../market/interfaces/IGlobalValid.sol";


contract MockGlobalValid{


     function isIncreasePosition(
         IGlobalValid.ValidParams memory params
    ) external view returns (bool) {
       return true;
    }

}
