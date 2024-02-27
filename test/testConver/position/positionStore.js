const { expect } = require("chai");
const {
  deployMarketFactory,
} = require("../../../scripts/market/marketFactory");
const {
  deployPositionBook,
} = require("../../../scripts/position/positionBook");
const {
  deployPositionStore,
  setPosition,
  setPositionBook,
  getPositionBookAddress,
  getAccountPosition,
  removePosition,
  getGlobalPosition,
  globalSize,
  contains,
  getPositionCount,
  getPositionKeys,
} = require("../../../scripts/position/positionStore");
const { ethers } = require("hardhat");
const { grantRoleIfNotGranted } = require("../../../scripts/utils/helpers");

describe("PositionStore", async function () {
  let pb;
  let ps;
  let factory;
  let owner, second, third;

  beforeEach(async function () {
    factory = await deployMarketFactory();
    pb = await deployPositionBook(factory.address);
    ps = await deployPositionStore(factory.address, true);
    [owner, second, third] = await ethers.getSigners();
    // console.log(pb.address, ps.address);
    await grantRoleIfNotGranted(ps, "MANAGER_ROLE", owner.address);
    await grantRoleIfNotGranted(ps, "ROLE_CONTROLLER", owner.address);
  });

  it("setPositionBook", async function () {
    let oldAddress = await getPositionBookAddress(true);
    await expect(setPositionBook(pb.address, true))
      .to.be.emit(ps, "UpdatePositionBook")
      .withArgs(oldAddress, pb.address);
    expect(await getPositionBookAddress(true)).to.equal(pb.address);
  });

  it("setPosition", async function () {
    let positionParam = {
      market: factory.address,
      isLong: true,
      lastTime: 0,
      extra3: 0,
      size: 100,
      collateral: 100,
      averagePrice: 100,
      entryFundingRate: 0,
      realisedPnl: 0,
      extra0: 0,
      extra1: 0,
      extra2: 0,
    };
    let globalPositionParam = await getGlobalPosition(true);
    await expect(
      setPosition(owner.address, positionParam, globalPositionParam, true)
    ).to.be.emit(
      ps,
      "UpdatePosition",
      positionParam.size,
      globalPositionParam.size
    );
  });
  it("removePosition", async function () {
    let positionParam = {
      market: factory.address,
      isLong: true,
      lastTime: 0,
      extra3: 0,
      size: 100,
      collateral: 100,
      averagePrice: 100,
      entryFundingRate: 0,
      realisedPnl: 0,
      extra0: 0,
      extra1: 0,
      extra2: 0,
    };
    let beforeglobalPositionParam = await getGlobalPosition(true);

    await setPosition(
      owner.address,
      positionParam,
      beforeglobalPositionParam,
      true
    );
    let afterglobalPositionParam = await getGlobalPosition(true);
    // expect(afterglobalPositionParam.size).to.be.equal(beforeglobalPositionParam.size.add(100))
    await expect(removePosition(owner.address, afterglobalPositionParam, true))
      .to.be.emit(ps, "RemovePosition")
      .withArgs(owner.address, 100, 100);
  });
  it("globalSize", async function () {
    let positionParam = {
      market: factory.address,
      isLong: true,
      lastTime: 0,
      extra3: 0,
      size: 100,
      collateral: 100,
      averagePrice: 100,
      entryFundingRate: 0,
      realisedPnl: 0,
      extra0: 0,
      extra1: 0,
      extra2: 0,
    };
    let beforeglobalPositionParam = await getGlobalPosition(true);

    await setPosition(
      second.address,
      positionParam,
      beforeglobalPositionParam,
      true
    );

    expect(await globalSize(true)).to.be.equal(
      beforeglobalPositionParam.size.add(0)
    );
  });

  it("getAccountPosition", async function () {
    let beforePosition = await getAccountPosition(second.address);
    let positionParam = {
      market: factory.address,
      isLong: true,
      lastTime: 0,
      extra3: 0,
      size: 100,
      collateral: 100,
      averagePrice: 100,
      entryFundingRate: 0,
      realisedPnl: 0,
      extra0: 0,
      extra1: 0,
      extra2: 0,
    };
    let beforeglobalPositionParam = await getGlobalPosition(true);

    await setPosition(
      second.address,
      positionParam,
      beforeglobalPositionParam,
      true
    );
    //expect(await getAccountPosition(second.address,true).size).to.be.equal(beforePosition.size.add(0))
  });
  it("contains", async function () {
    expect(await contains(third.address, true)).to.be.equal(false);
    let positionParam = {
      market: factory.address,
      isLong: true,
      lastTime: 0,
      extra3: 0,
      size: 100,
      collateral: 100,
      averagePrice: 100,
      entryFundingRate: 0,
      realisedPnl: 0,
      extra0: 0,
      extra1: 0,
      extra2: 0,
    };
    let beforeglobalPositionParam = await getGlobalPosition(true);

    await setPosition(
      third.address,
      positionParam,
      beforeglobalPositionParam,
      true
    );
    expect(await contains(third.address, true)).to.be.equal(true);
  });
  it("getPositionCount", async function () {
    let users = [owner, second, third];
    for (let i = 0; i < users.length; i++) {
      let positionParam = {
        market: factory.address,
        isLong: true,
        lastTime: 0,
        extra3: 0,
        size: 100,
        collateral: 100,
        averagePrice: 100,
        entryFundingRate: 0,
        realisedPnl: 0,
        extra0: 0,
        extra1: 0,
        extra2: 0,
      };
      let tmpglobalPositionParam = await getGlobalPosition(true);
      await setPosition(
        users[i].address,
        positionParam,
        tmpglobalPositionParam,
        true
      );
    }
    expect(await getPositionCount(true)).to.be.equal(users.length);
  });
  it("getPositionKeys", async function () {
    let users = [owner, second, third];

    for (let i = 0; i < users.length; i++) {
      let positionParam = {
        market: factory.address,
        isLong: true,
        lastTime: 0,
        extra3: 0,
        size: 100,
        collateral: 100,
        averagePrice: 100,
        entryFundingRate: 0,
        realisedPnl: 0,
        extra0: 0,
        extra1: 0,
        extra2: 0,
      };
      let tmpglobalPositionParam = await getGlobalPosition(true);

      await setPosition(
        users[i].address,
        positionParam,
        tmpglobalPositionParam,
        true
      );
    }
    expect((await getPositionKeys(0, users.length, true)).length).to.be.equal(
      users.length
    );
  });
});
