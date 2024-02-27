const { ethers } = require("hardhat");
const {
  deployFeeVault,
  updateGlobalFundingRate,
  getCumulativeFundingRates,
  getFundingRates,
  getLastFundingTimes,
  withdraw,
} = require("../../../../scripts/fee/feeVault");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const { expect } = require("chai");
const { deployUSDC, batchMint } = require("../../../../scripts/mocker/USDC");
//const { deployUSDC, batchMint } = require("../../../scripts/mocker/USDC");

describe("fundVault", async function () {
  let owner, second, market;
  let feeVault;
  let usdc;
  beforeEach(async function () {
    feeVault = await deployFeeVault();
    [owner, second, market] = await ethers.getSigners();
    usdc = await deployUSDC("USDC", "USDC", 10000000, true);

    await grantRoleIfNotGranted(feeVault, "ROLE_CONTROLLER", owner.address);
    await grantRoleIfNotGranted(feeVault, "WITHDRAW_ROLE", owner.address);
  });

  it("updateGlobalFundingRate", async function () {
    let rates = {
      longRate: 1000,
      shortRate: 2000,
      nextLongRate: 20000,
      nextShortRate: 10000,
    };
    let timestamp = 1683525115;

    await updateGlobalFundingRate(market.address, rates, timestamp);

    let longCumRate = await getCumulativeFundingRates(market.address, true);
    let shortCumRate = await getCumulativeFundingRates(market.address, false);
    let longRate = await getFundingRates(market.address, true);
    let shortRate = await getFundingRates(market.address, false);
    let ts = await getLastFundingTimes(market.address);

    expect(longCumRate).to.be.equal(rates.nextLongRate);
    expect(shortCumRate).to.be.equal(rates.nextShortRate);
    expect(longRate).to.be.equal(rates.longRate);
    expect(shortRate).to.be.equal(rates.shortRate);
    expect(ts).to.be.equal(timestamp);
  });

  it("getCumulativeFundingRates", async () => {
    let rates = {
      longRate: 1000,
      shortRate: 2000,
      nextLongRate: 20000,
      nextShortRate: 10000,
    };
    let timestamp = 1683525115;

    await updateGlobalFundingRate(market.address, rates, timestamp);

    let longCumRate = await getCumulativeFundingRates(market.address, true);
    let shortCumRate = await getCumulativeFundingRates(market.address, false);
    let longRate = await getFundingRates(market.address, true);
    let shortRate = await getFundingRates(market.address, false);
    let ts = await getLastFundingTimes(market.address);

    expect(longCumRate).to.be.equal(rates.nextLongRate);
    expect(shortCumRate).to.be.equal(rates.nextShortRate);
    expect(longRate).to.be.equal(rates.longRate);
    expect(shortRate).to.be.equal(rates.shortRate);
    expect(ts).to.be.equal(timestamp);
  });

  it("getFundingRates", async () => {
    let rates = {
      longRate: 1000,
      shortRate: 2000,
      nextLongRate: 20000,
      nextShortRate: 10000,
    };
    let timestamp = 1683525115;

    await updateGlobalFundingRate(market.address, rates, timestamp);

    let longCumRate = await getCumulativeFundingRates(market.address, true);
    let shortCumRate = await getCumulativeFundingRates(market.address, false);
    let longRate = await getFundingRates(market.address, true);
    let shortRate = await getFundingRates(market.address, false);
    let ts = await getLastFundingTimes(market.address);

    expect(longCumRate).to.be.equal(rates.nextLongRate);
    expect(shortCumRate).to.be.equal(rates.nextShortRate);
    expect(longRate).to.be.equal(rates.longRate);
    expect(shortRate).to.be.equal(rates.shortRate);
    expect(ts).to.be.equal(timestamp);
  });

  it("getLastFundingTimes", async () => {
    expect(await getLastFundingTimes(market.address)).to.be.equal(0);
    let rates = {
      longRate: 1000,
      shortRate: 2000,
      nextLongRate: 20000,
      nextShortRate: 10000,
    };
    let timestamp = 1683525115;
    await updateGlobalFundingRate(market.address, rates, timestamp);
    let ts = await getLastFundingTimes(market.address);
    expect(ts).to.be.equal(timestamp);
  });

  it("withdraw", async () => {
    expect(await usdc.balanceOf(feeVault.address)).to.be.equal(0);
    let amount = await usdc.balanceOf(owner.address);

    await batchMint([feeVault.address], 10000000);
    expect(await usdc.balanceOf(feeVault.address)).to.be.equal(10000000);
    await withdraw(usdc.address, owner.address, 10000000);

    expect(await usdc.balanceOf(feeVault.address)).to.be.equal(0);
    expect(await usdc.balanceOf(owner.address)).to.be.equal(
      amount.add(10000000)
    );
  });
});
