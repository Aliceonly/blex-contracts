// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.17;


import {IOrderBook} from "../order/interface/IOrderBook.sol";
import {IOrderStore} from "../order/interface/IOrderStore.sol";
import {OrderBook} from "../order/OrderBook.sol";
import {OrderStore} from "../order/OrderStore.sol";
import {MarketDataTypes} from "../market/MarketDataTypes.sol";
import {Order} from "../order/OrderStruct.sol";



contract MockOrderBook{

    IOrderStore public  openStore;
    IOrderStore public  closeStore;

    function setOpenStore(address open)external{
        openStore=IOrderStore(open);
    }

    function setCloseStore(address close)external{
        closeStore=IOrderStore(close);
    }

       function initialize(
        bool _isLong,
        address _openStore,
        address _closeStore
    ) external{
        
    }
    
    function add(
        MarketDataTypes.UpdateOrderInputs[] memory _vars
    )external returns(Order.Props[] memory){
        Order.Props[] memory arr=new  Order.Props[](5);
        for (uint256 i=0;i<5;i++){
            Order.Props memory data=Order.Props(
                1,
                0,
                0,
                msg.sender,
                0,
                0,
                1000,
                1000,
                0,
                uint64(i),
                0,
                0,
                bytes32("refCode")
            );
            arr[i]=data;
        }
        return arr;
    }

    function remove(bytes32 key,bool isLong)external returns (Order.Props[] memory _orders){
        Order.Props[] memory arr=new  Order.Props[](1);
        arr[0]=Order.Props(
                1,
                0,
                0,
                msg.sender,
                0,
                0,
                1000,
                1000,
                0,
                uint64(0),
                0,
                0,
                bytes32("refCode")
            );
            _orders=arr;
    }
     function removeByAccount(
        bool isOpen,
        address account
    ) external returns (Order.Props[] memory _orders){

    }

    function remove(
        address account,
        uint256 orderID,
        bool isOpen
    ) external returns (Order.Props[] memory _orders){

    }


}