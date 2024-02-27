const { ethers } = require("hardhat");
const { deployPositionBook } = require("../../../../scripts/mock/positionBook");

const { deployMarket } = require("../../../../scripts/mock/market");
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
  deployMockOrderMgr,
  setPositionBook,
  setMarketValid,
  setVaultRouter,
  setOraclePrice,
  setCollateralToken,
  setFeeRouter,
  setIndexToken,
  setOrderStore,
  setOrderBookLong,
  setorderBookShort,
  updateOrder,
  cancelOrderList,
  sysCancelOrder,
} = require("../../../../scripts/mock/orderMgr");
const {
  deployFeeRouter,
  setRouterFundFee,
} = require("../../../../scripts/mock/feeRouter");
const { deployMockOrderStore } = require("../../../../scripts/mock/orderStore");
const {
  deployMockOrderBook,
  setOpenStore,
  setCloseStore,
} = require("../../../../scripts/mock/orderBook");
const {
  deployMockMarketVaild,
} = require("../../../../scripts/mock/marketVaild");

describe("orderMgr", async () => {
  let MockOrderMgr;
  let owner, second, third, factory;
  let market, mv, positionBook, vr, pf, usdc, fr, os, ob, mvTmp;

  beforeEach(async () => {
    [owner, second, third, factory] = await ethers.getSigners();
    positionBook = await deployPositionBook(factory.address);
    pf = await deployOracle();
    ob = await deployMockOrderBook();
    os = await deployMockOrderStore();
    market = await deployMarket();
    mv = await deployMockMarketVaild();
    mvTmp = await deployMockMarketVaild();
    vr = await deployMockVaultRouter();
    usdc = await deployUSDC("UDSC", "USDC", 100000000);
    fr = await deployFeeRouter();
    console.log("fr", fr.address);
    console.log("usdc", usdc.address);
    console.log("market", market.address);
    await setPrice(usdc.address, 1000);
    MockOrderMgr = await deployMockOrderMgr();
    await setOpenStore(os.address);
    await setCloseStore(os.address);
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
  });

  it("updateOrder", async () => {
    marketData = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
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
      inputs: [1000, 2000, 3000, 4000, 5000],
    };
    await updateOrder(marketData);
  });

  it("cancelOrderList", async () => {
    let account = owner.address;
    let isIncreaseList = [true, true, true];
    let orderIDList = [1, 2, 3];
    let isLongList = [true, true, true];

    let beforeAmount = await usdc.balanceOf(account);
    await cancelOrderList(account, isIncreaseList, orderIDList, isLongList);
  });

  it("sysCancelOrder", async () => {
    let orderKey = [ethers.utils.formatBytes32String("111")];
    let isLong = [true];
    let isIncrease = [true];
    let reasons = ["ssss"];
    let beforeAmount = await usdc.balanceOf(owner.address);
    await sysCancelOrder(orderKey, isLong, isIncrease, reasons);
  });
});
