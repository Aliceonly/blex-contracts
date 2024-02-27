const { expect } = require("chai");
const {
  deployFactory,
  deployOrderBook,
} = require("../../../../scripts/order/deployAll");

const {
  add,
  update,
  removeByAccount,
  remove,
  removeByKey,
  getExecutableOrdersByPrice,
} = require("../../../../scripts/order/orderBook");
const {
  ordersIndex,
  generateID,
  containsKey,
  getOrderByKey,
  getOrderByAccount,
  addOrderStore,
  getAccountOrderNumber,
  delByAccount,
  getKeys,
} = require("../../../../scripts/order/orderStore");
const { ethers } = require("hardhat");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");

describe("OrderBook Contract", async function () {
  let orderBookContract;
  let openStore;
  let closeStore;
  let factory;
  let owner, second;
  before(async function () {
    factory = await deployFactory();
    [owner, second] = await ethers.getSigners();

    const { orderBook, orderStoreOpen, orderStoreClose } =
      await deployOrderBook(factory.address, true);

    orderBookContract = orderBook;
    openStore = orderStoreOpen;
    closeStore = orderStoreClose;

    await grantRoleIfNotGranted(
      orderBookContract,
      "ROLE_CONTROLLER",
      owner.address
    );
    await grantRoleIfNotGranted(openStore, "ROLE_CONTROLLER", owner.address);
    await grantRoleIfNotGranted(
      openStore,
      "ROLE_CONTROLLER",
      orderBookContract.address
    );
  });

  // it("initialize",async function (){
  //     console.log(orderBookContract.address)
  //     await initialize(openStore.address,closeStore.address,true,true)
  //     expect(await openStore.isLong()).to.be.equal(true)
  //     expect(await closeStore.isLong()).to.be.equal(true)
  // })

  it("add", async function () {
    console.log("sss");
    await generateID(owner.address, "0");
    const beforeOrderNum = await ordersIndex(owner.address, "0");

    const key = ethers.utils.solidityKeccak256(
      ["address", "uint64"],
      [owner.address, beforeOrderNum]
    );
    console.log("start");
    expect(await containsKey(key, "0")).to.be.equal(false);
    marketData = {
      _market: factory.address,
      _isLong: true,
      _oraclePrice: 1000,
      isOpen: true,
      isCreate: true,
      _order: {
        version: 1,
        updatedAtBlock: 0,
        triggerAbove: 2,
        account: owner.address,
        extra3: 0,
        collateral: 100,
        size: 100,
        price: 1000,
        extra1: 0,
        orderID: 0,
        extra2: 0,
        extra0: 0,
        refCode: ethers.utils.formatBytes32String("refCode"),
      },
      inputs: [],
    };
    await add([marketData], true);

    expect(await containsKey(key, "0")).to.be.equal(true);
    expect(await ordersIndex(owner.address, "0")).to.be.equal(
      beforeOrderNum.add(1)
    );

    await removeByAccount(true, owner.address, true);
    expect(await containsKey(key, "0")).to.be.equal(false);
  });

  it("update", async function () {
    let beforeOrderNum = await ordersIndex(owner.address, "0");

    const key = ethers.utils.solidityKeccak256(
      ["address", "uint64"],
      [owner.address, beforeOrderNum]
    );
    expect(await containsKey(key, "0")).to.equal(false);

    orderProps1 = {
      version: 1,
      updatedAtBlock: 0,
      triggerAbove: 2,
      account: owner.address,
      extra3: 0,
      collateral: 100,
      size: 100,
      price: 1000,
      extra1: 0,
      orderID: beforeOrderNum,
      extra2: 0,
      extra0: 0,
      refCode: ethers.utils.formatBytes32String("refCode"),
    };

    await addOrderStore(orderProps1, "0");

    expect(await containsKey(key, "0")).to.equal(true);
    expect((await getOrderByKey(key, "0")).orderID).to.equal(beforeOrderNum);
    let beforeTime = (await getOrderByKey(key, "0")).updatedAtBlock;
    marketData = {
      _market: factory.address,
      _isLong: true,
      _oraclePrice: 1000,
      isOpen: true,
      isCreate: true,
      _order: {
        version: 1,
        updatedAtBlock: 0,
        triggerAbove: 2,
        account: owner.address,
        extra3: 0,
        collateral: 100,
        size: 100,
        price: 1000,
        extra1: 0,
        orderID: beforeOrderNum,
        extra2: 0,
        extra0: 0,
        refCode: ethers.utils.formatBytes32String("refCode"),
      },
      inputs: [],
    };

    await update(marketData, true);
    expect((await getOrderByKey(key, "0")).updatedAtBlock).to.be.gt(beforeTime);
  });

  it("removeByAccount", async function () {
    let orders = await getOrderByAccount(owner.address, "0");
    expect(orders.length).to.be.gt(0, "order amount too little");
    await removeByAccount(true, owner.address, true);
    expect((await getOrderByAccount(owner.address, "0")).length).to.equal(0);
  });
  it("remove", async function () {
    const beforeOrderNum = await ordersIndex(owner.address, "0");

    const key = ethers.utils.solidityKeccak256(
      ["address", "uint64"],
      [owner.address, beforeOrderNum]
    );
    marketData = {
      _market: factory.address,
      _isLong: true,
      _oraclePrice: 1000,
      isOpen: true,
      isCreate: true,
      _order: {
        version: 1,
        updatedAtBlock: 0,
        triggerAbove: 2,
        account: owner.address,
        extra3: 0,
        collateral: 100,
        size: 100,
        price: 1000,
        extra1: 0,
        orderID: beforeOrderNum,
        extra2: 0,
        extra0: 0,
        refCode: ethers.utils.formatBytes32String("refCode"),
      },
      inputs: [],
    };
    await add([marketData], true);
    expect(await containsKey(key, "0")).to.equal(true);
    expect(await getAccountOrderNumber(owner.address, "0")).to.be.gt(0);
    //account,orderID,isOpen,label
    try {
      await remove(owner.address, beforeOrderNum, true, true);
    } catch {}
    //expect(await getAccountOrderNumber(owner.address,"0")).to.equal(vaildOrders.sub(1))
  });

  it("removeBykey", async function () {
    const beforeOrderNum = await ordersIndex(owner.address, "0");

    const key = ethers.utils.solidityKeccak256(
      ["address", "uint64"],
      [owner.address, beforeOrderNum]
    );
    marketData = {
      _market: factory.address,
      _isLong: true,
      _oraclePrice: 1000,
      isOpen: true,
      isCreate: true,
      _order: {
        version: 1,
        updatedAtBlock: 0,
        triggerAbove: 2,
        account: owner.address,
        extra3: 0,
        collateral: 100,
        size: 100,
        price: 1000,
        extra1: 0,
        orderID: beforeOrderNum,
        extra2: 0,
        extra0: 0,
        refCode: ethers.utils.formatBytes32String("refCode"),
      },
      inputs: [],
    };
    await add([marketData], true);
    expect(await containsKey(key, "0")).to.equal(true);

    try {
      await removeByKey(key, true, true);
    } catch {}

    //expect(await containsKey(key,"0")).to.equal(false)
  });

  it("getExecutableOrdersByPrice", async function () {
    await delByAccount(owner.address, "0");
    for (let i = 0; i < 10; i++) {
      const beforeOrderNum = await ordersIndex(owner.address, "0");
      const key = ethers.utils.solidityKeccak256(
        ["address", "uint64"],
        [owner.address, beforeOrderNum]
      );
      marketData = {
        _market: factory.address,
        _isLong: true,
        _oraclePrice: 1000,
        isOpen: true,
        isCreate: true,
        _order: {
          version: 1,
          updatedAtBlock: 0,
          triggerAbove: 2,
          account: owner.address,
          extra3: 0,
          collateral: 100,
          size: 100,
          price: 1000,
          extra1: 0,
          orderID: beforeOrderNum,
          extra2: 0,
          extra0: 0,
          refCode: ethers.utils.formatBytes32String("refCode"),
        },
        inputs: [],
      };
      await add([marketData], true);
      expect(await containsKey(key, "0")).to.equal(true);
    }
    expect((await getKeys(0, 100, "0")).length).to.be.equal(10);
    //max is 5
    expect(
      (await getExecutableOrdersByPrice(0, 9999, true, 999, true)).length
    ).to.equal(5);
    expect(
      (await getExecutableOrdersByPrice(0, 9, true, 1111, true)).length
    ).to.equal(0);
  });
});
