const { expect } = require("chai");
const {
  deployMarketFactory,
} = require("../../../scripts/market/marketFactory");
const {
  deployPositionBook,
  initPositionBook,
  getMarketAddr,
  getPositions,
  increasePosition,
  decreasePosition,
  decreaseCollateralFromCancelInvalidOrder,
  getLongStore,
  getShortStore,
  getAccountSize,
  getPosition,
  liquidatePosition,
  getMarketPNL,
  getPositionCount,
  getPositionKeys,
  getPNL,
  readPositionBookContract,
  initPositionBooks,
} = require("../../../scripts/position/positionBook");
const { ethers } = require("hardhat");

const { grantRoleIfNotGranted } = require("../../../scripts/utils/helpers");

describe("PositionBook", async function () {
  let ps, pb, factory;

  let owner, second;

  before(async function () {
    factory = await deployMarketFactory();
    pb = await deployPositionBook(factory.address);
    [owner, second] = await ethers.getSigners();

    await grantRoleIfNotGranted(pb, "ROLE_CONTROLLER", owner.address);
    await grantRoleIfNotGranted(pb, "ROLE_CONTROLLER", second.address);
  });

  it("initialize", async function () {
    let zeroAddress = "0x0000000000000000000000000000000000000000";
    await expect(initPositionBooks(zeroAddress)).to.be.rejectedWith(
      "invalid market address"
    );

    await initPositionBooks(factory.address);

    expect(await getMarketAddr()).to.be.equal(factory.address);
  });

  it("increasePosition", async function () {
    await increasePosition(owner.address, 10, 1000, 1000, 10, true);
    expect((await getPosition(owner.address, 0, true)).size).to.equal(1000);
  });

  it("decreasePosition", async function () {
    await increasePosition(owner.address, 10, 1000, 1000, 10, true);
    let beforePositionNumber = (await getPosition(owner.address, 0, true)).size;
    expect(beforePositionNumber).to.be.gt(100);
    await decreasePosition(owner.address, 10, 100, 10, true);
    expect((await getPosition(owner.address, 0, true)).size).to.be.equal(
      beforePositionNumber.sub(100)
    );
  });

  it("liquidatePosition", async function () {
    let users = [owner, second];
    await liquidatePosition(owner.address, 0, true);

    expect(await getPositionCount(true)).to.be.equal(0);
    expect(await getPositionCount(false)).to.be.equal(0);
    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }
    expect(await getPositionCount(true)).to.be.equal(users.length);
    expect(await getPositionCount(false)).to.be.equal(users.length);

    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
      await liquidatePosition(users[i].address, 0, false);
    }
    expect(await getPositionCount(true)).to.be.equal(0);
    expect(await getPositionCount(false)).to.be.equal(0);
  });

  it("decreaseCollateralFromCancelInvalidOrder", async function () {
    let users = [owner, second];

    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }

    for (let i = 0; i < users.length; i++) {
      expect((await getPositions(users[i].address)).length).to.be.equal(2);
      expect((await getPosition(users[i].address, 0, true)).size).to.be.equal(
        1000
      );
      expect(
        (await getPosition(users[i].address, 0, false)).collateral
      ).to.be.equal(10);
      expect((await getPosition(users[i].address, 0, false)).size).to.be.equal(
        1000
      );
    }

    for (let i = 0; i < users.length; i++) {
      await decreaseCollateralFromCancelInvalidOrder(users[i].address, 5, true);

      await decreaseCollateralFromCancelInvalidOrder(
        users[i].address,
        10,
        false
      );
    }

    for (let i = 0; i < users.length; i++) {
      expect(
        (await getPosition(users[i].address, 0, false)).collateral
      ).to.be.equal(0);
    }
  });

  it("getPositions", async function () {
    let users = [owner, second];

    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
      await liquidatePosition(users[i].address, 0, false);
    }
    expect(await getPositionCount(true)).to.be.equal(0);
    expect(await getPositionCount(false)).to.be.equal(0);
    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }
    for (let i = 0; i < users.length; i++) {
      expect((await getPosition(users[i].address, 0, true)).size).to.be.equal(
        1000
      );
    }

    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
      await liquidatePosition(users[i].address, 0, false);
    }

    //expect(await getPositions(users[1])).to.be.equal(2000)
  });

  it("getMarketSizes", async function () {
    let users = [owner, second];
    expect(await getPositionCount(true)).to.be.equal(0);
    expect(await getPositionCount(false)).to.be.equal(0);

    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }
    //console.log(await getLongStore().address)
    expect(await readPositionBookContract().longStore);

    //  expect(await getLongStore().globalSize()).to.be.equal(1000)
    //  expect(await getShortStore().globalSize()).to.be.equal(1000)

    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
      await liquidatePosition(users[i].address, 0, false);
    }
  });

  it("getAccountSize", async function () {
    let beforeSize = await getAccountSize(second.address);
    let users = [owner, second];
    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }
    let afterSize = await getAccountSize(second.address);
    for (let i = 0; i < afterSize; i++) {
      expect(afterSize[i]).to.be.equal(beforeSize[i].add(1000));
    }
    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
      await liquidatePosition(users[i].address, 0, false);
    }
  });

  it("getPosition", async function () {
    let users = [owner, second];
    for (let i = 0; i < users.length; i++) {
      expect((await getPosition(users[i].address, 0, true)).size).to.be.equal(
        0
      );
    }

    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }
    for (let i = 0; i < users.length; i++) {
      expect((await getPosition(users[i].address, 0, true)).size).to.be.equal(
        1000
      );
      expect((await getPosition(users[i].address, 0, false)).size).to.be.equal(
        1000
      );
    }
    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
      await liquidatePosition(users[i].address, 0, false);
    }
  });

  it("getPositionKeys", async function () {
    let users = [owner, second];
    expect(await getPositionCount(true)).to.be.equal(0);
    expect(await getPositionCount(false)).to.be.equal(0);

    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }

    expect((await getPositionKeys(0, users.length, true)).length).to.be.equal(
      users.length
    );
    expect((await getPositionKeys(0, users.length, false)).length).to.be.equal(
      users.length
    );

    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
      await liquidatePosition(users[i].address, 0, false);
    }
  });

  it("getPNL", async function () {
    let users = [owner, second];

    expect(await getPositionCount(true)).to.be.equal(0);
    expect(await getPositionCount(false)).to.be.equal(0);
    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }
    for (let i = 0; i < users.length; i++) {
      expect(await getPNL(users[i].address, 0, 2000, true)).to.be.equal(1000);
      expect(await getPNL(users[i].address, 0, 2000, false)).to.be.equal(-1000);
    }

    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
      await liquidatePosition(users[i].address, 0, false);
    }
  });

  it("getMarketPNL short", async function () {
    let users = [owner, second];
    expect(await getPositionCount(true)).to.be.equal(0);
    expect(await getPositionCount(false)).to.be.equal(0);
    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, false);
    }
    //todo
    //expect(await getMarketPNL(2000)).to.equal(-2000);

    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, false);
    }
  });

  it("getMarketPNL long", async function () {
    let users = [owner, second];
    expect(await getPositionCount(true)).to.be.equal(0);
    expect(await getPositionCount(false)).to.be.equal(0);
    //todo
    //console.log("marketPNL", await getMarketPNL(2000));
    for (let i = 0; i < users.length; i++) {
      await increasePosition(users[i].address, 10, 1000, 1000, 10, true);
    }
    //todo
    //expect(await getMarketPNL(2000)).to.equal(-2000);
    for (let i = 0; i < users.length; i++) {
      await liquidatePosition(users[i].address, 0, true);
    }
  });
});
