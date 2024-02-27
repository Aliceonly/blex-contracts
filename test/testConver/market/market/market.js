const {
  deployMarket,
  initialize,
  increasePositionWithOrders,
  decreasePosition,
  liquidatePositions,
  execOrderKey,
  updateCumulativeFundingRate,
  getPNL,
  addPlugin,
  setOrderBooks,
  setPositionBook,
  setMarketValid,
  setPositionMgr,
  setOrderMgr,
  setPriceFeed,
  getPositions,
  USDDecimals,
} = require("../../../../scripts/market/market");
const { deployPositionBook } = require("../../../../scripts/mock/positionBook");
const { deployMockOrderBook } = require("../../../../scripts/mock/orderBook");
const {
  deployMockMarketVaild,
  setMockMarketValidConf,
} = require("../../../../scripts/mock/marketVaild");
const { deployOracle, setPrice } = require("../../../../scripts/mock/oracle");
const {
  deployMockPositionSubMgr,
} = require("../../../../scripts/mock/positionSub");
const {
  deployMockPositionAddMgr,
  setOrderStore,
} = require("../../../../scripts/mock/positionAdd");
const { deployUSDC } = require("../../../../scripts/mocker/USDC");
const { deployFeeRouter } = require("../../../../scripts/mock/feeRouter");
const {
  deployMockVaultRouter,
} = require("../../../../scripts/mock/vaultRouter");
const { deployMockOrderMgr } = require("../../../../scripts/mock/orderMgr");
const { deployGlobalValid } = require("../../../../scripts/market/globalValid");
const {
  deployMockMarketRouter,
} = require("../../../../scripts/mock/marketRouter");
const { grantRoleIfNotGranted } = require("../../../../scripts/utils/helpers");
const { ethers } = require("hardhat");
const { string } = require("hardhat/internal/core/params/argumentTypes");
const { deployMockOrderStore } = require("../../../../scripts/mock/orderStore");
const {
  deployMockMarketVaildSub,
} = require("../../../../scripts/mock/marketVaildSub");
describe("market", async () => {
  let market, pb, obl, obs, mv, mvsub, pf, psm, pam;
  let its, fr, mr, vr, ct, gv, om;
  let owner, second, factory;

  beforeEach(async () => {
    [owner, second, factory] = await ethers.getSigners();
    //arr=ethers.utils.arrayify()
    market = await deployMarket(factory.address);

    pb = await deployPositionBook(factory.address);
    obl = await deployMockOrderBook();
    obs = obl;
    mv = await deployMockMarketVaild();
    // await setMockMarketValidConf(
    //   2, // _minSlippage
    //   300, //_maxSlippage
    //   2, //_minLeverage
    //   200, //_maxLeverage
    //   100000, //_maxTradeAmount
    //   10, //_minPay
    //   5, //_minCollateral
    //   true, //_allowOpen
    //   true, //_allowClose
    //   30 //_tokenDigits
    // );

    pf = await deployOracle();

    psm = await deployMockPositionSubMgr();
    pam = await deployMockPositionAddMgr();
    mvsub = await deployMockMarketVaildSub();
    its = await deployUSDC("USDC", "USDC", 1000000);
    await setPrice(its.address, 1000);
    fr = await deployFeeRouter();
    mr = await deployMockMarketRouter();
    vr = await deployMockVaultRouter();
    ct = its;
    gv = await deployGlobalValid();
    om = await deployMockOrderMgr();
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
      gv.address,
      om.address,
    ];
    let os = await deployMockOrderStore();

    await obl.setOpenStore(os.address);
    await obl.setCloseStore(os.address);
    console.log("start", os.address);

    await setOrderStore(true, true, os.address);
    console.log("start1");
    await setOrderStore(true, false, os.address);
    await initialize("eth", arr);

    await grantRoleIfNotGranted(market, "ROLE_CONTROLLER", owner.address);
    await grantRoleIfNotGranted(market, "ROLE_POS_KEEPER", owner.address);
    await grantRoleIfNotGranted(market, "MARKET_MGR_ROLE", owner.address);

    //grantRoleIfNotGranted(pam,"ROLE_CONTROLLER",market);
  });

  it("increasePositionWithOrders", async () => {
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

    //console.log(pb);

    await increasePositionWithOrders(input);
  });

  it("getPNL", async () => {
    await getPNL();
  });

  it("decreasePosition", async () => {
    let input = {
      _market: market.address,
      _isLong: true,
      _oraclePrice: 0,
      isOpen: false,
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
    //expect(await getMarketFundsUsed(MockPositionSubMgr.address)).to.be.equal(10000)
  });

  it("liquidatePositions", async () => {
    let accounts = [owner.address];

    await setMarketValid(mvsub.address);

    await liquidatePositions(accounts, true);

    //expect(await getMarketFundsUsed(MockPositionSubMgr.address)).to.be.equal(10000)
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

    await setPrice(its.address, 150);

    await execOrderKey(orderParams, input);
  });

  it("updateCumulativeFundingRate", async () => {
    await updateCumulativeFundingRate();
  });

  it("addPlugin", async () => {
    await addPlugin(owner.address);
  });

  it("setOrderBooks", async () => {
    await setOrderBooks(obl.address, obs.address);
  });

  it("setPositionBook", async () => {
    await setPositionBook(pb.address);
  });
  it("setMarketValid", async () => {
    await setMarketValid(mv.address);
  });

  it("setPositionMgr", async () => {
    await setPositionMgr(pam.address, true);
  });

  it("setOrderMgr", async () => {
    await setOrderMgr(obl.address);
  });

  it("getPositions", async () => {
    await getPositions(owner.address);
  });

  it("USDDecimals", async () => {
    await USDDecimals();
  });
});
