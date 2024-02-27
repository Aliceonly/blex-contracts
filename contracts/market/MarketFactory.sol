// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;

import {IMarket, MarketAddressIndex} from "./interfaces/IMarket.sol";
import {IOrderBook} from "../order/interface/IOrderBook.sol";
import {IMarketValid} from "./interfaces/IMarketValid.sol";
import {IMarketFactory} from "./interfaces/IMarketFactory.sol";
import "../ac/Ac.sol";

import {MarketConfigStruct} from "./MarketConfigStruct.sol";
import {IMarketRouter} from "./interfaces/IMarketRouter.sol";
import "./../position/interfaces/IPositionBook.sol";

contract MarketFactory is Ac {
    using MarketConfigStruct for IMarketValid.Props;

    IMarketFactory.Props[] public markets;
    mapping(address => uint256) public marketIndexes;

    event Create(
        address indexed market,
        address marketValid,
        address orderBookLong,
        address orderBookShort
    );

    constructor() Ac(msg.sender) {}

    function allMarketsLength() external view returns (uint) {
        return markets.length;
    }

    function getMarkets()
    external
    view
    returns (IMarketFactory.Outs[] memory _outs)
    {
        IMarketFactory.Props[] memory _markets = markets;
        uint len = _markets.length;
        _outs = new IMarketFactory.Outs[](len);
        for (uint i = 0; i < len; i++) {
            IMarketFactory.Props memory m = _markets[i];
            address _newMarketAddr = m.addr;
            IMarketValid.Props memory _conf = IMarketValid(
                IMarket(_newMarketAddr).marketValid()
            ).conf();

            _outs[i] = IMarketFactory.Outs({
                name: m.name,
                addr: m.addr,
                minPay: _conf.getMinPay(),
                allowOpen: _conf.getAllowOpen(),
                allowClose: _conf.getAllowClose()
            });
        }
    }

    function getMarket(
        address _marketAddr
    ) external view returns (IMarketFactory.Props memory) {
        uint256 index = marketIndexes[_marketAddr] - 1;
        return markets[index];
    }

    /* 
    event Remove(address _addr);

    function remove(address _addr) external onlyRole(MARKET_MGR_ROLE) {
        for (uint i = 0; i < markets.length; i++) {
            if (markets[i].addr == _addr) {
                if (i < markets.length - 1) {
                    markets[i] = markets[markets.length - 1];
                }

                IMarketRouter mr = IMarketRouter(
                    markets[i].inputs.addrs[MarketAddressIndex.ADDR_MR]
                );
                mr.removeMarket(_addr);
                markets.pop();

                emit Remove(_addr);
                break;
            }
        }
    }
    */

    event Create(IMarketFactory.CreateInputs _inputs);

    function create(
        IMarketFactory.CreateInputs memory _inputs
    ) external onlyInitOr(MARKET_MGR_ROLE) {
        IMarketValid marketValid = IMarketValid(
            _inputs.addrs[MarketAddressIndex.ADDR_MV]
        );
        marketValid.setConf(
            _inputs._minSlippage,
            _inputs._maxSlippage,
            _inputs._minLeverage,
            _inputs._maxLeverage,
            _inputs._maxTradeAmount,
            _inputs._minPay,
            _inputs._minCollateral,
            _inputs._allowOpen,
            _inputs._allowClose,
            18
        );

        IOrderBook obookl = IOrderBook(
            _inputs.addrs[MarketAddressIndex.ADDR_OBL]
        );

        obookl.initialize(
            true,
            _inputs._openStoreLong,
            _inputs._closeStoreLong
        );

        IOrderBook obooks = IOrderBook(
            _inputs.addrs[MarketAddressIndex.ADDR_OBS]
        );
        obooks.initialize(
            false,
            _inputs._openStoreShort,
            _inputs._closeStoreShort
        );

        //         position
        IPositionBook(_inputs.addrs[MarketAddressIndex.ADDR_PB]).initialize(
            _inputs._marketAddress
        );

        //         market
        IMarket(_inputs._marketAddress).initialize(
            _inputs.addrs,
            _inputs._name
        );
        IMarketFactory.Props memory _prop;
        _prop.name = _inputs._name;
        _prop.addr = _inputs._marketAddress;
        markets.push(_prop);

        //         market router
        IMarketRouter(_inputs.addrs[MarketAddressIndex.ADDR_MR]).addMarket(
            _inputs._marketAddress,
            address(0)
        );

        //         grant role - os -> ob
        //======================================
        Ac(_inputs._openStoreLong).grantRole(ROLE_CONTROLLER, address(obookl));

        Ac(_inputs._closeStoreLong).grantRole(ROLE_CONTROLLER, address(obookl));
        Ac(_inputs._openStoreShort).grantRole(ROLE_CONTROLLER, address(obooks));
        Ac(_inputs._closeStoreShort).grantRole(
            ROLE_CONTROLLER,
            address(obooks)
        );

        Ac(_inputs.addrs[MarketAddressIndex.ADDR_OBL]).grantRole(
            ROLE_CONTROLLER,
            _inputs._marketAddress
        );
        Ac(_inputs.addrs[MarketAddressIndex.ADDR_OBS]).grantRole(
            ROLE_CONTROLLER,
            _inputs._marketAddress
        );

        Ac(_inputs.addrs[MarketAddressIndex.ADDR_PB]).grantRole(
            ROLE_CONTROLLER,
            _inputs._marketAddress
        );

        Ac(_inputs._marketAddress).grantRole(
            ROLE_CONTROLLER,
            _inputs.addrs[MarketAddressIndex.ADDR_MR]
        );

        Ac(_inputs.addrs[MarketAddressIndex.ADDR_FR]).grantRole(
            ROLE_CONTROLLER,
            _inputs._marketAddress
        );
        marketIndexes[_inputs._marketAddress] = markets.length;

        emit Create(_inputs);
    }
}
