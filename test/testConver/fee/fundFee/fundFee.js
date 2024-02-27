const { ethers } = require("hardhat");
const {
  deployFeeVault,
  getCumulativeFundingRates,
  getFundingRates,
} = require("../../../../scripts/fee/feeVault");
const {
  deployFundFee,
  setMinRateLimit,
  getMinRateLimit,
  setFundingInterval,
  getFundingInterval,
  addSkipTime,
  updateCumulativeFundingRate,
  getFundingFee,
  getNextFundingRate,
  getFundingRate,
} = require("../../../../scripts/fee/fundFee");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const { expect } = require("chai");

describe("fundFee", async () => {
  let fundFee, feeVault;
  let owner, second, third;
  let market1, market2, market3;
  beforeEach(async () => {
    feeVault = await deployFeeVault(true);
    fundFee = await deployFundFee(feeVault.address);
    [owner, second, third, market1, market2, market3] =
      await ethers.getSigners();
    console.log("start");

    await grantRoleIfNotGranted(feeVault, "ROLE_CONTROLLER", fundFee.address);
    await grantRoleIfNotGranted(fundFee, "ROLE_CONTROLLER", owner.address);
  });

  it("setMinRateLimit", async () => {
    let beforeSetting = await getMinRateLimit();
    expect(beforeSetting).to.be.equal(2083);
    await setMinRateLimit(3000);
    expect(await getMinRateLimit()).to.be.equal(3000);
  });

  it("setFundingInterval 1", async () => {
    let markets = [market1.address, market2.address, market3.address];
    let internals = [3600, 7140, 7201];

    let result = [3600, 3600, 7200];
    await setFundingInterval(markets, internals);

    for (let i = 0; i < markets.length; i++) {
      expect(await getFundingInterval(markets[i])).to.be.equal(result[i]);
    }
  });

  it("setFundingInterval 2", async () => {
    let markets = [market1.address, market2.address, market3.address];

    let internals = [14400, 14401, 14460];

    let result = [14400, 14400, 14400];
    await setFundingInterval(markets, internals);

    for (let i = 0; i < markets.length; i++) {
      expect(await getFundingInterval(markets[i])).to.be.equal(result[i]);
    }
  });

  it("addSkipTime", async () => {
    await expect(addSkipTime(10, 1000))
      .to.be.emit(fundFee, "AddSkipTime")
      .withArgs(10, 1000);
  });

  async function getCurrentBlockTimeStamp() {
    const provider = waffle.provider; // ethers.provider
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    return block.timestamp;
  }

  async function advanceTime(timestamp) {
    const previousTS = await getCurrentBlockTimeStamp();
    const provider = waffle.provider;
    await provider.send("evm_setNextBlockTimestamp", [previousTS + timestamp]);
    await provider.send("evm_mine");
    await getCurrentBlockTimeStamp();
  }

  it("getFundingFee, 0 size", async function () {
    const longFundFee = await getFundingFee(owner.address, 0, 0, true);
    const shortFundFee = await getFundingFee(owner.address, 0, 0, false);
    expect(longFundFee).eq(0);
    expect(shortFundFee).eq(0);
  });

  it("getFundingFee, 10000 size, 0 entryFundingRate", async function () {
    const fundFee = await getFundingFee(owner.address, 10000, 0, true);
    expect(fundFee).eq(0);
  });

  it("getFundingFee, long 10000 size, close over 1H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600);
    await updateCumulativeFundingRate(owner.address, 10000, 0);

    const longFee = await getFundingFee(owner.address, 10000, 0, true);
    const shortFee = await getFundingFee(owner.address, 10000, 0, false);
    expect(longFee).eq(4);
    expect(shortFee).eq(0);
  });

  it("getFundingFee, short 10000 size, close over 1H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600);
    await updateCumulativeFundingRate(owner.address, 0, 10000);

    const longFee = await getFundingFee(owner.address, 10000, 0, true);
    const shortFee = await getFundingFee(owner.address, 10000, 0, false);
    expect(longFee).eq(0);
    expect(shortFee).eq(4);
  });

  it("getFundingFee, long 10000, short 5000, close over 1H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600);
    await updateCumulativeFundingRate(owner.address, 10000, 5000);

    const longFee = await getFundingFee(owner.address, 10000, 0, true);
    const shortFee = await getFundingFee(owner.address, 5000, 0, false);
    expect(longFee).eq(0);
    expect(shortFee).eq(0);
  });

  it("getFundingFee, long 100000000, short 50000000, close over 1H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600);
    await updateCumulativeFundingRate(owner.address, 100000000, 50000000);

    const longFee = await getFundingFee(owner.address, 100000000, 0, true);
    const shortFee = await getFundingFee(owner.address, 50000000, 0, false);
    expect(longFee).eq(4629);
    expect(shortFee).eq(0);
  });

  it("getFundingFee, long 100000000, short 90000000, close over 1H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600);
    await updateCumulativeFundingRate(owner.address, 100000000, 90000000);

    const longFee = await getFundingFee(owner.address, 100000000, 0, true);
    const shortFee = await getFundingFee(owner.address, 90000000, 0, false);
    expect(longFee).eq(2083);
    expect(shortFee).eq(1874);
  });

  it("getFundingFee, long 900000000, short 100000000, close over 1H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600);
    await updateCumulativeFundingRate(owner.address, 90000000, 100000000);

    const longFee = await getFundingFee(owner.address, 90000000, 0, true);
    const shortFee = await getFundingFee(owner.address, 100000000, 0, false);
    expect(longFee).eq(1874);
    expect(shortFee).eq(2083);
  });

  it("getFundingFee, long 100000000, short 90000000, close over 24H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(24 * 3600);
    await updateCumulativeFundingRate(owner.address, 100000000, 90000000);

    const longFee = await getFundingFee(owner.address, 100000000, 0, true);
    const shortFee = await getFundingFee(owner.address, 90000000, 0, false);
    expect(longFee).eq(49992);
    expect(shortFee).eq(44992);
  });

  it("getFundingFee, long 100000000/entryFundingRate 2083, short 90000000, close over 24H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(24 * 3600);
    await updateCumulativeFundingRate(owner.address, 100000000, 90000000);

    const longFee = await getFundingFee(owner.address, 100000000, 2083, true);
    const shortFee = await getFundingFee(owner.address, 90000000, 0, false);
    expect(longFee).eq(47909);
    expect(shortFee).eq(44992);
  });

  it("getFundingFee, long 100000000, short 90000000/entryFundingRate 2083, close over 24H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(24 * 3600);
    await updateCumulativeFundingRate(owner.address, 100000000, 90000000);

    const longFee = await getFundingFee(owner.address, 100000000, 0, true);
    const shortFee = await getFundingFee(owner.address, 90000000, 2083, false);
    expect(longFee).eq(49992);
    expect(shortFee).eq(43118);
  });

  it("getFundingFee, long 100000000/entryFundingRate 49992, short 90000000/entryFundingRate 2083, close over 24H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(2 * 24 * 3600);
    await updateCumulativeFundingRate(owner.address, 100000000, 90000000);

    const longFee = await getFundingFee(owner.address, 100000000, 49992, true);
    const shortFee = await getFundingFee(owner.address, 90000000, 2083, false);
    expect(longFee).eq(49992);
    expect(shortFee).eq(88110);
  });

  it("getFundingFee, long 50000000/entryFundingRate 20830, short 40000000/entryFundingRate 2083, close over 24H", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(100 * 24 * 3600);
    await updateCumulativeFundingRate(owner.address, 50000000, 40000000);

    const longFee = await getFundingFee(owner.address, 50000000, 20830, true);
    const shortFee = await getFundingFee(owner.address, 40000000, 2083, false);
    expect(longFee).eq(2489185);
    expect(shortFee).eq(1998846);
  });

  async function validUpdateCumulativeFundingRate(inputs) {
    const longRates = await getCumulativeFundingRates(owner.address, true);
    const shortRates = await getCumulativeFundingRates(owner.address, false);

    const longRate = await getFundingRates(owner.address, true);
    const shortRate = await getFundingRates(owner.address, false);

    expect(longRate).eq(inputs.longRate);
    expect(shortRate).eq(inputs.shortRate);
    expect(longRates).eq(inputs.longRates);
    expect(shortRates).eq(inputs.shortRates);
  }

  it("updateCumulativeFundingRate, longSize 0, shortSize 0", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);

    const inputs = {
      longRate: 0,
      shortRate: 0,
      longRates: 0,
      shortRates: 0,
    };
    await validUpdateCumulativeFundingRate(inputs);
  });

  it("updateCumulativeFundingRate, longSize 10000, shortSize 0, frist", async function () {
    await updateCumulativeFundingRate(owner.address, 10000, 0);

    const inputs = {
      longRate: 0,
      shortRate: 0,
      longRates: 0,
      shortRates: 0,
    };
    await validUpdateCumulativeFundingRate(inputs);
  });

  it("updateCumulativeFundingRate, longSize 10000, shortSize 10000, frist", async function () {
    await updateCumulativeFundingRate(owner.address, 10000, 10000);

    const inputs = {
      longRate: 0,
      shortRate: 0,
      longRates: 0,
      shortRates: 0,
    };
    await validUpdateCumulativeFundingRate(inputs);
  });

  it("updateCumulativeFundingRate, longSize 10000, shortSize 10000, two, 1 min", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await updateCumulativeFundingRate(owner.address, 10000, 10000);

    const inputs = {
      longRate: 0,
      shortRate: 0,
      longRates: 0,
      shortRates: 0,
    };
    await validUpdateCumulativeFundingRate(inputs);
  });

  it("updateCumulativeFundingRate, longSize 10000, shortSize 10000, 2 times, over 1 hour", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600 + 1);
    await updateCumulativeFundingRate(owner.address, 10000, 10000);

    const inputs = {
      longRate: 2083,
      shortRate: 2083,
      longRates: 2083,
      shortRates: 2083,
    };
    await validUpdateCumulativeFundingRate(inputs);
  });

  it("updateCumulativeFundingRate, longSize 10000, shortSize 10000, 3 times, over 1 hour", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600 + 1);
    await updateCumulativeFundingRate(owner.address, 10000, 10000);
    await updateCumulativeFundingRate(owner.address, 200000, 20000);

    const inputs = {
      longRate: 2083,
      shortRate: 2083,
      longRates: 2083,
      shortRates: 2083,
    };
    await validUpdateCumulativeFundingRate(inputs);
  });

  it("updateCumulativeFundingRate, longSize 10000, shortSize 10000, 3 times, each over 1 hour", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600 + 1);
    await updateCumulativeFundingRate(owner.address, 10000, 10000);
    await advanceTime(3600 + 1);
    await updateCumulativeFundingRate(owner.address, 200000, 20000);

    const inputs = {
      longRate: 27892,
      shortRate: 0,
      longRates: 29975,
      shortRates: 2083,
    };
    await validUpdateCumulativeFundingRate(inputs);
  });

  it("updateCumulativeFundingRate, longSize 20000, shortSize 200000, 3 times, over 24 hour", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3600 + 1);
    await updateCumulativeFundingRate(owner.address, 10000, 10000);
    await advanceTime(24 * 3600 + 1);
    await updateCumulativeFundingRate(owner.address, 20000, 200000);

    const inputs = {
      longRate: 0,
      shortRate: 27892,
      longRates: 2083,
      shortRates: 671491,
    };
    await validUpdateCumulativeFundingRate(inputs);
  });

  it("getFundingInterval", async () => {
    let markets = [market1.address, market2.address, market3.address];
    let internals = [3600, 7140, 7201];

    let result = [3600, 3600, 7200];
    await setFundingInterval(markets, internals);

    for (let i = 0; i < markets.length; i++) {
      expect(await getFundingInterval(markets[i])).to.be.equal(result[i]);
    }
  });

  it("getMinRateLimit", async () => {
    expect(await getMinRateLimit()).to.be.equal(2083);
    await setMinRateLimit(3000);
    expect(await getMinRateLimit()).to.be.equal(3000);
  });

  it("getNextFundingRate", async () => {
    let res = await getNextFundingRate(owner.address, 1000, 1000);
    // expect(res[0]).to.be.equal(980672234)
    //expect(res[1]).to.be.equal(980672234)
  });

  it("getFundingRate", async () => {
    await getFundingRate(owner.address, true);
    // expect().to.be.equal(2083);
  });
});
