const { ethers } = require("hardhat");
const { deployPositionBook } = require("../../../../scripts/mock/positionBook");
const {
  deployMockMarketVaild,
} = require("../../../../scripts/mock/marketVaild");
const {
  deployMarket,
  setMarketRouterMockMarket,
} = require("../../../../scripts/mock/market");
const {
  deployMockVaultRouter,
  getMarketFundsUsed,
  getTemAddress,
} = require("../../../../scripts/mock/vaultRouter");
const {
  deployOracle,
  setPrice,
  readOracleContract,
} = require("../../../../scripts/mock/oracle");
const { deployUSDC } = require("../../../../scripts/mocker/USDC");
const { expect } = require("chai");
const {
  deployMockPositionAddMgr,
  setPositionBook,
  increasePositionWithOrders,
  setMarketValid,
  setVaultRouter,
  setOraclePrice,
  setCollateralToken,
  setFeeRouter,
  setIndexToken,
  setOrderStore,
  setOrderBookLong,
  execOrderKey,
  setorderBookShort,
  setMarketRouter,
} = require("../../../../scripts/mock/positionAdd");
const {
  deployFeeRouter,
  setRouterFundFee,
} = require("../../../../scripts/mock/feeRouter");
const { deployMockOrderStore } = require("../../../../scripts/mock/orderStore");
const { deployMockOrderBook } = require("../../../../scripts/mock/orderBook");
const { formatBytes32String } = require("ethers/lib/utils");
const {
  deployMockMarketRouter,
} = require("../../../../scripts/mock/marketRouter");

describe("positionAddMgr", async () => {
  let MockPositionAddMgr;
  let owner, second, third, factory;
  let market, mv, positionBook, vr, pf, usdc, fr, os, ob;

  beforeEach(async () => {
    [owner, second, third, factory] = await ethers.getSigners();
    positionBook = await deployPositionBook(factory.address);
    pf = await deployOracle();
    ob = await deployMockOrderBook();
    os = await deployMockOrderStore();
    market = await deployMarket();
    mr = await deployMockMarketRouter(true);

    mv = await deployMockMarketVaild();
    vr = await deployMockVaultRouter();
    usdc = await deployUSDC("UDSC", "USDC", 100000000);
    fr = await deployFeeRouter();
    console.log("fr", fr.address);
    console.log("usdc", usdc.address);
    console.log("market", market.address);
    await setPrice(usdc.address, 1000);
    MockPositionAddMgr = await deployMockPositionAddMgr();
    await setPositionBook(positionBook.address);
    await setMarketValid(mv.address);
    await setVaultRouter(vr.address);
    await setOraclePrice(pf.address);
    await setFeeRouter(fr.address);
    await setRouterFundFee(10);
    await setCollateralToken(usdc.address);
    await setIndexToken(usdc.address);
    await setOrderStore(true, true, os.address);
    await setOrderStore(true, false, os.address);
    await setOrderBookLong(ob.address);
    await setorderBookShort(ob.address);
    await setMarketRouter(mr.address);
  });

  it("increasePositionWithOrders", async () => {
    // console.log("market",await positionAddMgr.marketValid())

    let input = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      _account: owner.address,
      _sizeDelta: 10000,
      _price: 1000,
      _slippage: 3,
      _isExec: true,
      liqState: 0,
      _fromOrder: 0,
      _refCode: ethers.utils.formatBytes32String("ref"),
      collateralDelta: 1000,
      execNum: 0,
      inputs: [0, 1, 2, 3],
    };
    console.log("positionBook", await MockPositionAddMgr.positionBook());
    await increasePositionWithOrders(input);
    expect(await getMarketFundsUsed(MockPositionAddMgr.address)).to.be.equal(
      10000
    );
  });

  it("execOrderKey", async () => {
    let orderParams = {
      version: 1,
      updatedAtBlock: 0,
      triggerAbove: 2,
      account: owner.address,
      extra3: 0,
      collateral: 1000,
      size: 100,
      price: ethers.utils.parseUnits(1000 + "", 30),
      extra1: 0,
      orderID: 100,
      extra2: 0,
      extra0: 0,
      refCode: ethers.utils.formatBytes32String("refCode"),
    };
    let input = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      _account: owner.address,
      _sizeDelta: 1000,
      _price: 1000,
      _slippage: 0,
      _isExec: true,
      liqState: 0,
      _fromOrder: 0,
      _refCode: ethers.utils.formatBytes32String("ref"),
      collateralDelta: 1000,
      execNum: 0,
      inputs: [199, 222, 2223, 4456, 5555],
    };
    // console.log(ob.address)

    //await setPrice(usdc.address, 150);
    // console.log(ob.address);
    await execOrderKey(orderParams, input);

    // expect(await getMarketFundsUsed(MockPositionAddMgr.address)).to.be.equal(
    //   10000
    // );
  });
});
