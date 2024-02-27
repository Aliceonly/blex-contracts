// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
pragma experimental ABIEncoderV2;


import {PositionSubMgr} from"../market/PositionSubMgr.sol";

import {IPositionBook} from "../position/interfaces/IPositionBook.sol";
import {IFeeRouter} from "../fee/interfaces/IFeeRouter.sol";

import {IOrderStore} from "../order/interface/IOrderStore.sol";
import {IOrderBook} from "../order/interface/IOrderBook.sol";
import {IMarketValid} from "../market/interfaces/IMarketValid.sol";



contract MockPositionSubMgr is PositionSubMgr{
    
    function setPositionBook(address book) external {
        positionBook =  IPositionBook(book);
    }

    function setIndexToken(address _indexToken)external{
        indexToken=_indexToken;
    }

    function setMarketValid(address _newMv) external  {
        marketValid = IMarketValid(_newMv);
    }

    function setVaultRouter(address vr) external{
        vaultRouter=vr;
    }

    function setOraclePrice(address pf)external{
        priceFeed=pf;
    }

    function  setCollateralToken(address token) external{
        collateralToken=token;
    }

    function setFeeRouter(address fr)external{
        feeRouter= IFeeRouter(fr);
    }

    function setOrderStore( 
        bool isLong,
        bool isOpen,
        address os
    )external{
        orderStores[isLong][isOpen]=IOrderStore(os);
    } 

    function setorderBookLong(address orderBook) external{
        orderBookLong=IOrderBook(orderBook);
    }
     function setorderBookShort(address orderBook) external{
        orderBookShort=IOrderBook(orderBook);
    }

}

