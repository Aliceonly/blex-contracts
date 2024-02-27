const { ethers } = require("hardhat");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const {
  setFeeAndRates,
  getFeeAndRates,
  updateCumulativeFundingRate,
  getCumulativeFundingRates,
  getGlobalFees,
  getFees,
  getOrderFees,
  getFundingRate,
  collectFees,
  getExecFee,
  withdraw,
} = require("../../../../scripts/fee/feeRouter");
const { deployFee } = require("../../../../scripts/fee/deployFeeAll");
const { expect } = require("chai");
const { getFundingRates } = require("../../../../scripts/fee/feeVault");

const { deployUSDC, batchMint } = require("../../../../scripts/mocker/USDC");

const {
  deployMockMarketFactoryContract,
  setMarketMockMarketFactoryContract,
} = require("../../../../scripts/mock/marketFactory");

describe("feeRouter", async function () {
  let owner, second, third, factory;
  let market1, market2;
  let feeContracts;
  let usdc;
  beforeEach(async () => {
    [owner, second, third, market1, market2] = await ethers.getSigners();

    factory = await deployMockMarketFactoryContract();
    await setMarketMockMarketFactoryContract("ETH", owner.address);
    feeContracts = await deployFee(factory.address, true, true);
    usdc = await deployUSDC("USDC", "USDT", 10000000, true);

    console.log(
      "xxx",
      feeContracts.feeRouter.address,
      feeContracts.feeVault.address
    );

    await grantRoleIfNotGranted(
      feeContracts.feeRouter,
      "ROLE_CONTROLLER",
      owner.address
    );
    await grantRoleIfNotGranted(
      feeContracts.feeVault,
      "ROLE_CONTROLLER",
      owner.address
    );
    await grantRoleIfNotGranted(
      feeContracts.feeRouter,
      "WITHDRAW_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      feeContracts.feeRouter,
      "MARKET_MGR_ROLE",
      owner.address
    );
    await grantRoleIfNotGranted(
      feeContracts.feeVault,
      "WITHDRAW_ROLE",
      feeContracts.feeRouter.address
    );
  });

  it("setFeeAndRates, openFeeRate 0.1%", async function () {
    const feeRates = ["100000"];

    await setFeeAndRates(owner.address, feeRates);
    const feeRate = await getFeeAndRates(owner.address, 0);

    expect(feeRate).eq(feeRates[0]);
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

  it("setFeeAndRates, closeFeeRate 0.1%", async function () {
    const feeRates = ["0", "100000"];

    await setFeeAndRates(owner.address, feeRates);
    const feeRate = await getFeeAndRates(owner.address, 1);

    expect(feeRate).eq(feeRates[1]);
  });

  it("setFeeAndRates, exec fee 1u", async function () {
    const feeRates = ["0", "0", "0", "1000000000000000000"];

    await setFeeAndRates(owner.address, feeRates);
    const feeRate = await getFeeAndRates(owner.address, 3);

    expect(feeRate).eq(feeRates[3]);
  });

  it("setFeeAndRates, liquidate fee 5u", async function () {
    const feeRates = ["0", "0", "0", "0", "5000000000000000000"];

    await setFeeAndRates(owner.address, feeRates);
    const feeRate = await getFeeAndRates(owner.address, 4);

    expect(feeRate).eq(feeRates[4]);
  });

  it("setFeeAndRates, batch set fee rate and fee", async function () {
    const feeRates = [
      "100000",
      "100000",
      "0",
      "1000000000000000000",
      "5000000000000000000",
    ];

    await setFeeAndRates(owner.address, feeRates);
    const openRate = await getFeeAndRates(owner.address, 0);
    const closeRate = await getFeeAndRates(owner.address, 1);
    const execFee = await getFeeAndRates(owner.address, 3);
    const liqFee = await getFeeAndRates(owner.address, 4);

    expect(openRate).eq(feeRates[0]);
    expect(closeRate).eq(feeRates[1]);
    expect(execFee).eq(feeRates[3]);
    expect(liqFee).eq(feeRates[4]);
  });

  it("updateCumulativeFundingRate, longSize 0, shortSize 0, first", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);

    const longRates = await getCumulativeFundingRates(owner.address, true);
    const shortRates = await getCumulativeFundingRates(owner.address, false);
    const longRate = await getFundingRates(owner.address, true);
    const shortRate = await getFundingRates(owner.address, false);

    expect(longRates).eq(0);
    expect(shortRates).eq(0);
    expect(longRate).eq(0);
    expect(shortRate).eq(0);
  });

  it("updateCumulativeFundingRate, longSize 0, shortSize 0", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3601);
    await updateCumulativeFundingRate(owner.address, 0, 0);

    const longRates = await getCumulativeFundingRates(owner.address, true);
    const shortRates = await getCumulativeFundingRates(owner.address, false);
    const longRate = await getFundingRates(owner.address, true);
    const shortRate = await getFundingRates(owner.address, false);

    expect(longRates).eq(2083);
    expect(shortRates).eq(2083);
    expect(longRate).eq(2083);
    expect(shortRate).eq(2083);
  });

  it("updateCumulativeFundingRate, longSize 10000, shortSize 9000", async function () {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3601);
    await updateCumulativeFundingRate(owner.address, 10000, 9000);

    const longRates = await getCumulativeFundingRates(owner.address, true);
    const shortRates = await getCumulativeFundingRates(owner.address, false);
    const longRate = await getFundingRates(owner.address, true);
    const shortRate = await getFundingRates(owner.address, false);

    expect(longRates).eq(2083);
    expect(shortRates).eq(2083);
    expect(longRate).eq(2083);
    expect(shortRate).eq(2083);
  });

  //   it("getGlobalFees", async () => {
  //     expect(await getGlobalFees()).to.be.equal(0);
  //     await increaseFees(market1.address, owner.address, [100, 100]);
  //     expect(await getGlobalFees()).to.be.equal(200);
  //   });

  //   it("getAccountFees", async () => {
  //     expect(await getAccountFees(owner.address)).to.be.equal(0);
  //     await increaseFees(market1.address, owner.address, [100, 100]);
  //     expect(await getAccountFees(owner.address)).to.be.equal(200);
  //   });

  it("getExecFee", async function () {
    expect(await getExecFee(owner.address)).eq(0);
    const feeRates = ["0", "0", "0", "20000", "5000000000000000000"];

    await setFeeAndRates(owner.address, feeRates);

    expect(await getExecFee(owner.address)).eq(feeRates[3]);
  });

  it("getFundingRate", async () => {
    //expect(await getFundingRate(owner.address,1000,1000,true)).to.be.equal(2083)
    await getFundingRate(owner.address, true);
  });

  it("getOrderFees", async () => {
    let input = {
      _market: market1.address,
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

    await getOrderFees(input);
  });

  it("getFees", async () => {
    let input = {
      _market: market1.address,
      _isLong: true,
      _oraclePrice: 1000,
      isOpen: true,
      _account: owner.address,
      _sizeDelta: 100,
      _price: 1000,
      _slippage: 5,
      _isExec: true,
      liqState: 1,
      _fromOrder: 0,
      _refCode: ethers.constants.HashZero,
      collateralDelta: 1000,
      execNum: 10,
      inputs: [],
    };

    let positionParam = {
      market: market1.address,
      isLong: true,
      lastTime: 0,
      extra3: 0,
      size: 100,
      collateral: 100,
      averagePrice: 100,
      entryFundingRate: 1,
      realisedPnl: 1,
      extra0: 0,
      extra1: 0,
      extra2: 0,
    };

    await getFees(input, positionParam);
  });

  it("cumulativeFundingRates", async () => {
    await updateCumulativeFundingRate(owner.address, 0, 0);
    await advanceTime(3601);
    await updateCumulativeFundingRate(owner.address, 10000, 9000);

    expect(await getCumulativeFundingRates(owner.address, true)).to.be.equal(
      2083
    );
  });

  it("collectFees", async () => {
    expect(await usdc.balanceOf(feeContracts.feeVault.address)).to.be.equal(0);
    await batchMint([feeContracts.feeVault.address, owner.address], 10000000);
    let amount = await usdc.balanceOf(owner.address);

    await usdc.approve(feeContracts.feeRouter.address, 10000000);

    await collectFees(owner.address, usdc.address, [100, 100]);

    expect(await usdc.balanceOf(owner.address)).to.be.equal(
      amount.sub(10000000)
    );
  });

  it("withdraw", async () => {
    expect(await usdc.balanceOf(feeContracts.feeVault.address)).to.be.equal(0);
    let amount = await usdc.balanceOf(owner.address);

    // await batchMint([feeContracts.feeRouter.address],10000000);
    await batchMint([feeContracts.feeVault.address], 10000000);

    expect(await usdc.balanceOf(feeContracts.feeVault.address)).to.be.equal(
      10000000
    );
    console.log(await usdc.balanceOf(feeContracts.feeVault.address));
    await withdraw(usdc.address, owner.address, 10000000);

    expect(await usdc.balanceOf(feeContracts.feeVault.address)).to.be.equal(0);
    expect(await usdc.balanceOf(owner.address)).to.be.equal(
      amount.add(10000000)
    );
  });
});
