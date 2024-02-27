// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {MarketConfigStruct} from "../market/MarketConfigStruct.sol";
import {IMarketValid} from "../market/interfaces/IMarketValid.sol";
import {IMarketFactory} from "../market/interfaces/IMarketFactory.sol";

contract MockMarketFactory is IMarketFactory {
    using MarketConfigStruct for IMarketValid.Props;

    Props[] public markets;


    function getMarket(
        address _marketAddr
    ) external view returns (Props memory) {}

    function getMarkets() external view returns (Outs[] memory _outs) {
        Props[] memory _markets = markets;
        uint len = _markets.length;
        _outs = new Outs[](len);
        for (uint i = 0; i < len; i++) {
            Props memory m = _markets[i];
            // address _newMarketAddr = m.addr;
            // IMarketValid.Props memory _conf = IMarketValid(
            //     IMarket(_newMarketAddr).marketValid()
            // ).conf();

            _outs[i] = Outs({
                name: m.name,
                addr: m.addr,
                minPay: 20,
                allowOpen: true,
                allowClose: true
            });
        }
    }

    function setMarket(string memory name, address addr) external {
        Props memory _prop;
        _prop.name = name;
        _prop.addr = addr;
        // _prop.allowOpen = true;
        markets.push(_prop);
    }
}
