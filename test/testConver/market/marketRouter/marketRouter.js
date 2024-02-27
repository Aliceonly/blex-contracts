const { ethers } = require("hardhat");
const {
  deployMarketRouter,
  initializeRouter,
  addMarket,
  getMarkets,
  increasePosition,
  validateIncreasePosition,
  decreasePosition,
  updateOrder,
  getGlobalPNL,
  getGlobalSize,
  getAccountSize,
  updatePositionBook,
  updatePositionCallback,
  cancelOrderList,
  removeMarket,
  deleteOrderCallback,
  updateOrderCallback,
  setIsEnableMarketConvertToOrder,
  increasePositionHandleTx,
} = require("../../../../scripts/market/marketRouter");
const { deployGlobalMarket } = require("../../../../scripts/market/deploy");
const { expect } = require("chai");
const {
  deployMockVaultRouter,
} = require("../../../../scripts/mock/vaultRouter");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const { deployPositionBook } = require("../../../../scripts/mock/positionBook");
const { deployMockOrderBook } = require("../../../../scripts/mock/orderBook");
const {
  deployMockMarketVaild,
} = require("../../../../scripts/mock/marketVaild");
const {
  deployMockMarketVaildSub,
} = require("../../../../scripts/mock/marketVaildSub");
const { deployMockOrderStore } = require("../../../../scripts/mock/orderStore");

const {
  deployMockMarketRouter,
} = require("../../../../scripts/mock/marketRouter");
const { deployMockOrderMgr } = require("../../../../scripts/mock/orderMgr");
const { deployFeeRouter } = require("../../../../scripts/mock/feeRouter");
const { deployUSDC } = require("../../../../scripts/mocker/USDC");
const {
  deployMockPositionAddMgr,
  setOrderStore,
} = require("../../../../scripts/mock/positionAdd");
const {
  deployMockPositionSubMgr,
} = require("../../../../scripts/mock/positionSub");
const { deployOracle, setPrice } = require("../../../../scripts/mock/oracle");
const {
  deployMarket,
  initialize,
  setPositionBook,
} = require("../../../../scripts/market/market");
const {
  deployMockGlobalValid,
} = require("../../../../scripts/mock/globalVaild");

const {
  deployMarket: deployMockMarket,
} = require("../../../../scripts/mock/market");

describe("marketRouter", async () => {
  let owner, second, third, factory;
  let vr, gr, mr, market;
  let pb, obl, obs, mv, pf, psm, pam, mvsub;
  let its, fr, ct, gv, om;
  let mockMarket;

  beforeEach(async () => {
    [owner, second, third, factory] = await ethers.getSigners();
    vr = await deployMockVaultRouter();
    gr = await deployMockGlobalValid();
    mr = await deployMarketRouter();
    await initializeRouter(factory.address, gr.address, vr.address);

    market = await deployMarket(factory.address);
    mockMarket = await deployMockMarket();

    pb = await deployPositionBook(factory.address);

    obl = await deployMockOrderBook();

    obs = obl;
    mv = await deployMockMarketVaild();

    pf = await deployOracle();
    psm = await deployMockPositionSubMgr();
    pam = await deployMockPositionAddMgr();
    mvsub = await deployMockMarketVaildSub();

    its = await deployUSDC("USDC", "USDC", 1000000);
    await setPrice(its.address, 1000);
    fr = await deployFeeRouter();
    // vr = await deployMockVaultRouter();
    ct = its;
    om = await deployMockOrderMgr();
    let os = await deployMockOrderStore();

    await obl.setOpenStore(os.address);

    await obl.setCloseStore(os.address);
    console.log("start123");
    await setOrderStore(true, true, os.address);
    console.log("start123");
    await setOrderStore(true, false, os.address);
    let arr = [
      pb.address,
      obl.address,
      obl.address,
      mv.address,
      pf.address,
      psm.address,
      pam.address,
      its.address,
      fr.address,
      mr.address,
      vr.address,
      its.address,
      gr.address,
      om.address,
    ];
    await initialize("eth", arr);
    await grantRoleIfNotGranted(market, "ROLE_POS_KEEPER", mr.address);
    await grantRoleIfNotGranted(market, "ROLE_CONTROLLER", mr.address);
    await grantRoleIfNotGranted(market, "ROLE_CONTROLLER", owner.address);
    await grantRoleIfNotGranted(mr, "MARKET_MGR_ROLE", owner.address);
    await grantRoleIfNotGranted(market, "MARKET_MGR_ROLE", owner.address);
    await grantRoleIfNotGranted(mr, "MARKET_MGR_ROLE", market.address);
  });

  it("validateIncreasePosition", async () => {
    expect((await getMarkets()).length).to.be.equal(0);
    await addMarket(market.address, ethers.constants.AddressZero);
    expect((await getMarkets()).length).to.be.equal(1);

    let input = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      _account: owner.address,
      _sizeDelta: 0,
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
    await validateIncreasePosition(input);
  });

  it("getMarkets", async () => {
    expect((await getMarkets()).length).to.be.equal(0);
    await addMarket(market.address, ethers.constants.AddressZero);
    expect((await getMarkets()).length).to.be.equal(1);
  });

  it("increasePosition", async () => {
    //console.log("ssss");
    expect((await getMarkets()).length).to.be.equal(0);
    await addMarket(market.address, ethers.constants.AddressZero);
    expect((await getMarkets()).length).to.be.equal(1);
    let input = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      _account: owner.address,
      _sizeDelta: 0,
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
    await setIsEnableMarketConvertToOrder(false);
    await increasePositionHandleTx(input);
  });

  it("getGlobalPNL", async () => {
    await getGlobalPNL();
  });

  it("decreasePosition", async () => {
    expect((await getMarkets()).length).to.be.equal(0);
    await addMarket(market.address, ethers.constants.AddressZero);
    expect((await getMarkets()).length).to.be.equal(1);

    let input = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      _account: owner.address,
      _sizeDelta: 10000,
      _price: 1000,
      _slippage: 3,
      _isExec: false,
      liqState: 2,
      _fromOrder: 0,
      _refCode: ethers.utils.formatBytes32String("ref"),
      collateralDelta: 1000,
      execNum: 0,
      inputs: [0, 1, 2, 3],
    };
    await decreasePosition(input);
  });

  it("updateOrder", async () => {
    expect((await getMarkets()).length).to.be.equal(0);
    await addMarket(market.address, ethers.constants.AddressZero);
    expect((await getMarkets()).length).to.be.equal(1);
    let orderParams = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      isCreate: true,
      _order: {
        version: 1,
        updatedAtBlock: 0,
        triggerAbove: 1,
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
    await updateOrder(orderParams);
  });

  it("cancelOrderList", async () => {
    let markets = [market.address];
    let isIncreaseList = [true];
    let orderIDList = [10];
    let isLongList = [true];
    expect((await getMarkets()).length).to.be.equal(0);
    await addMarket(market.address, ethers.constants.AddressZero);
    expect((await getMarkets()).length).to.be.equal(1);
    await cancelOrderList(markets, isIncreaseList, orderIDList, isLongList);
  });

  it("updatePositionBook", async () => {
    // expect((await getMarkets()).length).to.be.equal(0)
    // await addMarket(market.address)
    // expect((await getMarkets()).length).to.be.equal(1)
    //auth market contract call

    expect((await getMarkets()).length).to.be.equal(0);
    await addMarket(market.address, ethers.constants.AddressZero);
    await setPositionBook(pb.address);
    // try {
    //   await updatePositionBook(pb.address);
    // } catch {
    //   console.log("xxxx");
    // }
  });

  it("removeMarket", async () => {
    expect((await getMarkets()).length).to.be.equal(0);
    await addMarket(market.address, ethers.constants.AddressZero);
    expect((await getMarkets()).length).to.be.equal(1);
    await removeMarket(market.address);
    expect((await getMarkets()).length).to.be.equal(0);
  });

  it("getGlobalSize", async () => {
    await getGlobalSize();
  });

  it("getAccountSize", async () => {
    await getAccountSize(owner.address);
  });

  it("deleteOrderCallback", async () => {
    let order = {
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
    };

    let input = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      _account: owner.address,
      _sizeDelta: 10000,
      _price: 1000,
      _slippage: 3,
      _isExec: false,
      liqState: 2,
      _fromOrder: 0,
      _refCode: ethers.utils.formatBytes32String("ref"),
      collateralDelta: 1000,
      execNum: 0,
      inputs: [0, 1, 2, 3],
    };
    let event = {
      order: order,
      inputs: input,
      reason: 1,
      dPNL: 2,
    };

    try {
      await deleteOrderCallback(event);
    } catch {
      console.log("auth market contract address call");
    }
  });

  it("updateOrderCallback", async () => {
    let orderParams = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      isCreate: true,
      _order: {
        version: 1,
        updatedAtBlock: 0,
        triggerAbove: 1,
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

    try {
      await updateOrderCallback(orderParams);
    } catch {
      console.log("auth market contract address call");
    }
  });

  it("updatePositionCallback", async () => {
    let input = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: true,
      _account: owner.address,
      _sizeDelta: 10000,
      _price: 1000,
      _slippage: 3,
      _isExec: false,
      liqState: 2,
      _fromOrder: 0,
      _refCode: ethers.utils.formatBytes32String("ref"),
      collateralDelta: 1000,
      execNum: 0,
      inputs: [0, 1, 2, 3],
    };

    let positionParam = {
      market: market.address,
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
    let fees = [10, 20];
    let collateralToken = its.address;
    let indexToken = its.address;
    let collateralDeltaAfter = 10;
    let event = {
      inputs: input,
      position: positionParam,
      fees: fees,
      collateralToken: collateralToken,
      indexToken: indexToken,
      collateralDeltaAfter: collateralDeltaAfter,
    };

    try {
      await updatePositionCallback(event);
    } catch {
      console.log();
    }
  });
});
