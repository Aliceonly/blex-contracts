const { expect } = require("chai");
const { deployFactory, deployOrderBook } = require("../../../../scripts/order/deployAll");
const { 
    deployOrderStore,
    ordersIndex,
    addOrderStore,
    getOrderByKey,
    generateID,
    containsKey,
    setOrderStore,
    removeOrderStore,
    getOrderByAccount,
    delByAccount,
    getCount,
    getKey,
    getKeys,
    getByIndex,
} = require("../../../../scripts/order/orderStore");
const { ethers } = require("hardhat");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");


describe("OrderStore",async function(){
    let orderStore;
    let owner;
    let second;

    before(async function(){
        let factory=await deployFactory();
        [owner,second]=await ethers.getSigners();

        const {
            orderBook,
            orderStoreOpen,
            orderStoreClose,
        }=await deployOrderBook(factory.address,"Long")
        
        orderStore=orderStoreOpen
        // const addrs=readContractAddresses()
        // console.log(addrs)
        
        await grantRoleIfNotGranted(orderStore,"ROLE_CONTROLLER",owner.address)
        
    })


 
    it("add order",async function(){
        const beforeOrderNum=await ordersIndex(owner.address,"0");
        await generateID(owner.address,"0")

        const key = ethers.utils.solidityKeccak256(
            ["address", "uint64"],
            [
                owner.address,
                beforeOrderNum,
            ]
        );
        expect(await containsKey(key,"0")).to.equal(false)
        expect((await getKeys(0,100,"0")).length).to.be.equal(0)

        let orderProps = {
            version: 1,
            updatedAtBlock: 0,
            triggerAbove:0,
            account: owner.address,
            extra3:0,
            collateral: 0,
            size: 100,
            price: 1000,
            extra1: 0,
            orderID: beforeOrderNum,
            extra2:0,
            extra0: 0,
            refCode: ethers.utils.formatBytes32String("refCode")
        };

       await addOrderStore(orderProps,"0")
       expect((await getOrderByKey(key,"0")).orderID).to.equal(beforeOrderNum)
       expect(await containsKey(key,"0")).to.be.equal(true)
    })

    it("add muti order ",async function(){
        await delByAccount(owner.address,"0")
        expect(await getCount("0")).to.be.equal(0)

        for (let i=0;i<10;i++){
            const beforeOrderNum=await ordersIndex(owner.address,"0");
            await generateID(owner.address,"0")
    
            const key = ethers.utils.solidityKeccak256(
                ["address", "uint64"],
                [
                    owner.address,
                    beforeOrderNum,
                ]
            );
            
            expect(await containsKey(key,"0")).to.equal(false)
            let orderProps = {
                version: 1,
                updatedAtBlock: 0,
                triggerAbove:0,
                account: owner.address,
                extra3:0,
                collateral: 0,
                size: 100,
                price: 1000,
                extra1: 0,
                orderID: beforeOrderNum,
                extra2:0,
                extra0: 0,
                refCode: ethers.utils.formatBytes32String("refCode")
            };    
            await addOrderStore(orderProps,"0")

           expect(await containsKey(key,"0")).to.equal(true)
        }
        expect((await getKeys(0,100,"0")).length).to.be.equal(10) 
    })

    it("set order",async function(){
        await delByAccount(owner.address,"0")
        expect(await getCount("0")).to.be.equal(0)

        let id_before = await ordersIndex(owner.address,"0")
        await generateID(owner.address,"0")
        const key = ethers.utils.solidityKeccak256(
            ["address", "uint64"],
            [
                owner.address,
                id_before,
            ]
        );
        expect(await containsKey(key,"0")).to.equal(false)
        orderProps1 = {
            version: 1,
            updatedAtBlock: 0,
            triggerAbove:0,
            account: owner.address,
            extra3:0,
            collateral: 0,
            size: 100,
            price: 1000,
            extra1: 0,
            orderID: id_before,
            extra2:0,
            extra0: 0,
            refCode: ethers.utils.formatBytes32String("refCode")
        };

        await addOrderStore(orderProps1,"0")
        
        expect(await containsKey(key,"0")).to.equal(true)
        expect((await getOrderByKey(key,"0")).orderID).to.equal(id_before)
        let beforeTime=(await getOrderByKey(key,"0")).updatedAtBlock;
        orderProps2 = {
            version: 1,
            updatedAtBlock: 0,
            triggerAbove:0,
            account: owner.address,
            extra3:0,
            collateral: 100,
            size: 100,
            price: 1000,
            extra1: 0,
            orderID: id_before,
            extra2:0,
            extra0: 0,
            refCode: ethers.utils.formatBytes32String("refCode")
        };

        await setOrderStore(orderProps2,"0")
        expect((await getOrderByKey(key,"0")).updatedAtBlock).to.be.gt(beforeTime)
        expect((await getOrderByKey(key,"0")).collateral).to.be.equal(100)
    })


    it("remove order",async function(){
        await delByAccount(owner.address,"0")
        expect(await getCount("0")).to.be.equal(0)

        const beforeOrderNum=await ordersIndex(owner.address,"0");
        await generateID(owner.address,"0")

        const key = ethers.utils.solidityKeccak256(
            ["address", "uint64"],
            [
                owner.address,
                beforeOrderNum,
            ]
        );
        expect(await containsKey(key,"0")).to.equal(false)

        orderProps = {
            version: 1,
            updatedAtBlock: 0,
            triggerAbove:0,
            account: owner.address,
            extra3:0,
            collateral: 100,
            size: 100,
            price: 1000,
            extra1: 0,
            orderID: beforeOrderNum,
            extra2:0,
            extra0: 0,
            refCode: ethers.utils.formatBytes32String("refCode")
        };

       
        await addOrderStore(orderProps,"0")
        expect(await containsKey(key,"0")).to.equal(true)
        expect((await getOrderByKey(key,"0")).orderID).to.equal(beforeOrderNum)
        await removeOrderStore(key,"0")
        expect(await containsKey(key,"0")).to.be.eq(false)
    })

    it("delByAccount",async function(){
        await delByAccount(owner.address,"0")
        expect(await getCount("0")).to.be.equal(0)
        for (let i=0;i<10;i++){
            
            const beforeOrderNum=await ordersIndex(owner.address,"0");
            await generateID(owner.address,"0")
    
            const key = ethers.utils.solidityKeccak256(
                ["address", "uint64"],
                [
                    owner.address,
                    beforeOrderNum,
                ]
            );

            orderProps = {
                version: 1,
                updatedAtBlock: 0,
                triggerAbove:0,
                account: owner.address,
                extra3:0,
                collateral: 100,
                size: 100,
                price: 1000,
                extra1: 0,
                orderID: beforeOrderNum,
                extra2:0,
                extra0: 0,
                refCode: ethers.utils.formatBytes32String("refCode")
            };
            await addOrderStore(orderProps,"0")
            expect(await containsKey(key,"0")).to.equal(true)
        }
        expect(await getCount("0")).to.be.equal(10)

         await delByAccount(owner.address,"0")

         expect(await getCount("0")).to.be.equal(0)

    })
    

    it("getOrderByAccount",async function(){


        expect(await getCount("0")).to.be.equal(0)
        expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(0)


        for (let i=0;i<10;i++){
            const beforeOrderNum=await ordersIndex(owner.address,"0");
            await generateID(owner.address,"0")
    
            const key = ethers.utils.solidityKeccak256(
                ["address", "uint64"],
                [
                    owner.address,
                    beforeOrderNum,
                ]
            );
            
            expect(await containsKey(key,"0")).to.equal(false)
            let orderProps = {
                version: 1,
                updatedAtBlock: 0,
                triggerAbove:0,
                account: owner.address,
                extra3:0,
                collateral: 0,
                size: 100,
                price: 1000,
                extra1: 0,
                orderID: beforeOrderNum,
                extra2:0,
                extra0: 0,
                refCode: ethers.utils.formatBytes32String("refCode")
            };    
            await addOrderStore(orderProps,"0")

           expect(await containsKey(key,"0")).to.equal(true)
        }
        expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(10)
        

        await delByAccount(owner.address,"0")

        expect(await getCount("0")).to.be.equal(0)


    })


    it("getByIndex",async ()=>{
        for (let i=0;i<10;i++){
            const beforeOrderNum=await ordersIndex(owner.address,"0");
            await generateID(owner.address,"0")
    
            const key = ethers.utils.solidityKeccak256(
                ["address", "uint64"],
                [
                    owner.address,
                    beforeOrderNum,
                ]
            );
            
            expect(await containsKey(key,"0")).to.equal(false)
            let orderProps = {
                version: 1,
                updatedAtBlock: 0,
                triggerAbove:0,
                account: owner.address,
                extra3:0,
                collateral: i,
                size: 100,
                price: 1000,
                extra1: 0,
                orderID: beforeOrderNum,
                extra2:0,
                extra0: 0,
                refCode: ethers.utils.formatBytes32String("refCode")
            };    
            await addOrderStore(orderProps,"0")

           expect(await containsKey(key,"0")).to.equal(true)
        }

        expect((await getByIndex(8,"0")).collateral).to.be.equal(8)
        await delByAccount(owner.address,"0")
        expect(await getCount("0")).to.be.equal(0)
    })


    it("containsKey",async ()=>{
        expect(await getCount("0")).to.be.equal(0)
        expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(0)


        for (let i=0;i<10;i++){
            const beforeOrderNum=await ordersIndex(owner.address,"0");
            await generateID(owner.address,"0")
    
            const key = ethers.utils.solidityKeccak256(
                ["address", "uint64"],
                [
                    owner.address,
                    beforeOrderNum,
                ]
            );
            
            expect(await containsKey(key,"0")).to.equal(false)
            let orderProps = {
                version: 1,
                updatedAtBlock: 0,
                triggerAbove:0,
                account: owner.address,
                extra3:0,
                collateral: 0,
                size: 100,
                price: 1000,
                extra1: 0,
                orderID: beforeOrderNum,
                extra2:0,
                extra0: 0,
                refCode: ethers.utils.formatBytes32String("refCode")
            };    
            await addOrderStore(orderProps,"0")

           expect(await containsKey(key,"0")).to.equal(true)
        }
        expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(10)
        

        await delByAccount(owner.address,"0")

        expect(await getCount("0")).to.be.equal(0)


    })


    it("getCount",async ()=>{
        expect(await getCount("0")).to.be.equal(0)
        expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(0)


        for (let i=0;i<10;i++){
            const beforeOrderNum=await ordersIndex(owner.address,"0");
            await generateID(owner.address,"0")
    
            const key = ethers.utils.solidityKeccak256(
                ["address", "uint64"],
                [
                    owner.address,
                    beforeOrderNum,
                ]
            );
            
            expect(await containsKey(key,"0")).to.equal(false)
            let orderProps = {
                version: 1,
                updatedAtBlock: 0,
                triggerAbove:0,
                account: owner.address,
                extra3:0,
                collateral: 0,
                size: 100,
                price: 1000,
                extra1: 0,
                orderID: beforeOrderNum,
                extra2:0,
                extra0: 0,
                refCode: ethers.utils.formatBytes32String("refCode")
            };    
            await addOrderStore(orderProps,"0")

           expect(await containsKey(key,"0")).to.equal(true)
        }
        expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(10)
        

        await delByAccount(owner.address,"0")

        expect(await getCount("0")).to.be.equal(0)

    })



    it("getKey",async ()=>{

        expect(await getCount("0")).to.be.equal(0)
        expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(0)


        for (let i=0;i<10;i++){
            const beforeOrderNum=await ordersIndex(owner.address,"0");
            await generateID(owner.address,"0")
    
            const key = ethers.utils.solidityKeccak256(
                ["address", "uint64"],
                [
                    owner.address,
                    beforeOrderNum,
                ]
            );
            
            expect(await containsKey(key,"0")).to.equal(false)
            let orderProps = {
                version: 1,
                updatedAtBlock: 0,
                triggerAbove:0,
                account: owner.address,
                extra3:0,
                collateral: 0,
                size: 100,
                price: 1000,
                extra1: 0,
                orderID: beforeOrderNum,
                extra2:0,
                extra0: 0,
                refCode: ethers.utils.formatBytes32String("refCode")
            };    
            await addOrderStore(orderProps,"0")

            expect(await getKey(i,"0")).to.be.equal(key)

           expect(await containsKey(key,"0")).to.equal(true)
        }
        expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(10)
        await delByAccount(owner.address,"0")
        expect(await getCount("0")).to.be.equal(0)

    })

   it("getKeys",async ()=>{
    expect(await getCount("0")).to.be.equal(0)
    expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(0)
    let keys= new Array(10);

    for (let i=0;i<10;i++){
        const beforeOrderNum=await ordersIndex(owner.address,"0");
        await generateID(owner.address,"0")

        const key = ethers.utils.solidityKeccak256(
            ["address", "uint64"],
            [
                owner.address,
                beforeOrderNum,
            ]
        );
        keys[i]=key;
        
        expect(await containsKey(key,"0")).to.equal(false)
        let orderProps = {
            version: 1,
            updatedAtBlock: 0,
            triggerAbove:0,
            account: owner.address,
            extra3:0,
            collateral: 0,
            size: 100,
            price: 1000,
            extra1: 0,
            orderID: beforeOrderNum,
            extra2:0,
            extra0: 0,
            refCode: ethers.utils.formatBytes32String("refCode")
        };    
        await addOrderStore(orderProps,"0")

        expect(await getKey(i,"0")).to.be.equal(key)

       expect(await containsKey(key,"0")).to.equal(true)
    }
    expect((await getOrderByAccount(owner.address,"0")).length).to.be.equal(10)
    
    

    for (let i=0;i<10;i++){
        expect((await getKeys(0,10,"0")).at(i)).to.be.equal(keys[i])
    }

    await delByAccount(owner.address,"0")

    expect(await getCount("0")).to.be.equal(0)

   })
   


 })