const { ethers } = require("hardhat");
const {
  deployGlobalValid,
  setMaxMarketSizeLimit,
  readGlobalValidContract,
} = require("../../../scripts/market/globalValid");
const { setMarket } = require("../../../scripts/vault/vaultRouter");
const {
  deployMarket,
  initialize: initializeMarket,
  readMarketContract,
  setPositionBook,
} = require("../../../scripts/market/market");
const {
  deployPositionBook,
  initPositionBook,
  readPositionBookContract,
} = require("../../../scripts/position/positionBook");
const {
  deployOrderBook,
  readOrderBook,
} = require("../../../scripts/order/deployAll");

const { deployOrderBook: DB } = require("../../../scripts/order/orderBook");
const {
  deployMarketValid,
  setMarketValidConf,
  readMarketValidContract,
} = require("../../../scripts/market/marketValid");
const {
  deployPositionAddMgr,
  readPositionAddMgrContract,
} = require("../../../scripts/market/positionAddMgr");
const {
  deployPositionSubMgr,
  readPositionSubMgrContract,
} = require("../../../scripts/market/positionSubMgr");
const {
  deployOrderMgr,
  readOrderMgrContract,
} = require("../../../scripts/market/orderMgr");
const {
  deployMarketRouter,
  addMarket,
  initializeRouter,
  readMarketRouterContract,
  decreasePosition,
  connectDecreasePosition,
  setIsEnableMarketConvertToOrder,
  cancelOrderList,
  connectCancelOrderList,
} = require("../../../scripts/market/marketRouter");

const { deployFee, readAllFee } = require("../../../scripts/fee/deployFeeAll");
const {
  deployAll: deployAllLp,
  readLpContract,
} = require("../../../scripts/lp/deploy");
const {
  deployMarketFactory,
  readMarketFactoryContract,
  createMarket,
} = require("../../../scripts/market/marketFactory");
const {
  grantRoleIfNotGranted,
  handleTx,
} = require("../../../scripts/utils/helpers");
const {
  deployOracle,
  readOracleContract,
  getPrice,
  setPrice,
} = require("../../../scripts/mock/oracle");

const {
  deployToken,
  balanceOf,
  mint,
  userApprove,
  readTokenContract,
  connectMint,
} = require("../../../scripts/mock/erc20");
const {
  deployMarketReader,
  readMarketReaderContract,
} = require("../../../scripts/market/marketReader");
const { initializeReader } = require("../../../scripts/market/marketReader");
const { setFeeAndRates } = require("../../../scripts/fee/feeRouter");
const { numberToBigNumber, getCurrentPosition } = require("../utils/utils");
const { deployOrderRouter } = require("../../../scripts/market/orderRouter");
const {
  initializeOrderRouter,
} = require("../../../scripts/market/orderRouter");
const {
  orderRouterAddMarkets,
} = require("../../../scripts/market/orderRouter");
const { readCoreVaultContract } = require("../../../scripts/vault/coreVault");
const {
  buildDecreasePositionParam,
  buildCreateInputsParams,
} = require("../utils/buildParams");
const { BigNumber } = require("ethers");
const { validSize } = require("../utils/vaildData");
const {
  getOrderByAccount,
  deployOrderStore,
} = require("../../../scripts/order/orderStore");
const { expect } = require("chai");
const {
  deployAutoOrderMock,
  readAutoOrderMock,
} = require("../../../scripts/am/autoOrderMock");
const {
  deployAutoLiqMock,
  readAutoLiqMock,
} = require("../../../scripts/am/autoLiqMock");
const {
  readAutoOrderContract,
  deployAutoOrder,
} = require("../../../scripts/automation/autoOrder");
const {
  readAutoLiquidateContract,
  deployAutoLiquidate,
} = require("../../../scripts/automation/autoLiquidate");
const {
  readChainPriceContract,
} = require("../../../scripts/oracle/chainPriceFeed");
const {
  readFastPriceContract,
} = require("../../../scripts/oracle/fastPriceFeed");
const {
  readOracleContract: readPriceContract,
} = require("../../../scripts/oracle/price");
const { readUSDCContract } = require("../../../scripts/mocker/USDC");
const {
  readIndexTokenAddressFromAPI,
} = require("../../../scripts/vault/indexToken");

const addressjson = {
  ETH: "0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08",
  BTC: "0x6550bc2301936011c1334555e62A87705A81C12C",
};

const COLLATERAL_TOKEN_DECIMAL = 18;
async function deployServiceAllMarket() {
  let [owner, second, third] = await ethers.getSigners();
  let factory = await deployMarketFactory();

  let USDC = await deployToken("USDC", "USDC");
  let lpContracts = await deployAllLp(USDC);

  let allFee = await deployFee(factory.address);

  await lpContracts.initLP({
    USDC: USDC,
    name: "USDC",
    symbol: "USDC",
    vault: lpContracts.vault,
    vaultRouter: lpContracts.vaultRouter,
    vaultReward: lpContracts.vaultReward,
    feeRouter: allFee.feeRouter,
    rewardDistributor: lpContracts.rewardDistributor,
  });

  let positionBook = await deployPositionBook(factory.address);

  let orderBookLong = await deployOrderBook(factory.address, true);
  let orderBookShort = await deployOrderBook(factory.address, false);
  let marketVaild = await deployMarketValid(factory.address);
  let priceFeed = await deployOracle();

  let positionAddMgr = await deployPositionAddMgr();
  let positionSubMgr = await deployPositionSubMgr();
  let orderMgr = await deployOrderMgr();

  let indexToken = addressjson["ETH"];

  let globalVaild = await deployGlobalValid(true);
  let marketRouter = await deployMarketRouter(factory.address);
  await initializeRouter(
    factory.address,
    globalVaild.address,
    lpContracts.vaultRouter.address
  );
  await grantRoleIfNotGranted(marketRouter, "MARKET_MGR_ROLE", owner.address);

  let collateralToken = USDC.address;
  let market = await deployMarket(factory.address);
  let marketReader = await deployMarketReader(factory.address);
  await initializeReader(marketRouter.address, lpContracts.vaultRouter.address);
  // let orderRouter = await deployOrderRouter(factory.address);
  await grantRoleIfNotGranted(marketVaild, "MARKET_MGR_ROLE", owner.address);

  let arr = [
    positionBook.address,
    orderBookLong.orderBook.address,
    orderBookShort.orderBook.address,
    marketVaild.address,
    priceFeed.address,
    positionSubMgr.address,
    positionAddMgr.address,
    indexToken,
    allFee.feeRouter.address,
    marketRouter.address,
    lpContracts.vaultRouter.address,
    collateralToken,
    globalVaild.address,
    orderMgr.address,
  ];

  let inputs = buildCreateInputsParams({
    _name: "ETH",
    _marketAddress: market.address, //2
    addrs: arr,
    _openStoreLong: orderBookLong.orderStoreOpen.address, //11
    _closeStoreLong: orderBookLong.orderStoreClose.address, //12
    _openStoreShort: orderBookShort.orderStoreOpen.address, //13
    _closeStoreShort: orderBookShort.orderStoreClose.address, //14
    _minSlippage: 2,
    _maxSlippage: 300,
    _minLeverage: 2,
    _maxLeverage: 200,
    _maxTradeAmount: 10000,
    _minPay: 10,
    _minCollateral: 5,
    _allowOpen: true,
    _allowClose: true,
    _tokenDigits: 30,
  });

  await createMarket(inputs);

  await initializeMarket("ETH", arr);

  await initPositionBook(market.address);

  await addMarket(market.address, lpContracts.vault.address);
  await grantRoleIfNotGranted(
    allFee.feeRouter,
    "ROLE_CONTROLLER",
    market.address
  );
  await grantRoleIfNotGranted(
    lpContracts.vaultRouter,
    "VAULT_MGR_ROLE",
    owner.address
  );

  await grantRoleIfNotGranted(
    lpContracts.vaultRouter,
    "MULTI_SIGN_ROLE",
    owner.address
  );
  await setMarket(market.address, lpContracts.vault.address);

  await grantRoleIfNotGranted(
    allFee.feeRouter,
    "ROLE_CONTROLLER",
    lpContracts.vaultRouter.address
  );
  await grantRoleIfNotGranted(
    allFee.feeRouter,
    "ROLE_CONTROLLER",
    lpContracts.vaultReward.address
  );
  await grantRoleIfNotGranted(
    allFee.feeRouter,
    "ROLE_CONTROLLER",
    lpContracts.vault.address
  );
  await grantRoleIfNotGranted(positionBook, "ROLE_CONTROLLER", market.address);
  await grantRoleIfNotGranted(
    positionBook,
    "ROLE_CONTROLLER",
    positionAddMgr.address
  );
  await grantRoleIfNotGranted(
    positionBook,
    "ROLE_CONTROLLER",
    positionSubMgr.address
  );
  await grantRoleIfNotGranted(
    orderBookLong.orderBook,
    "ROLE_CONTROLLER",
    orderMgr.address
  );
  await grantRoleIfNotGranted(
    orderBookShort.orderBook,
    "ROLE_CONTROLLER",
    orderMgr.address
  );
  await grantRoleIfNotGranted(
    orderBookLong.orderBook,
    "ROLE_CONTROLLER",
    market.address
  );
  await grantRoleIfNotGranted(
    orderBookShort.orderBook,
    "ROLE_CONTROLLER",
    market.address
  );
  await grantRoleIfNotGranted(
    positionAddMgr,
    "ROLE_CONTROLLER",
    market.address
  );
  await grantRoleIfNotGranted(
    positionSubMgr,
    "ROLE_CONTROLLER",
    market.address
  );
  await grantRoleIfNotGranted(orderMgr, "ROLE_CONTROLLER", market.address);
  await grantRoleIfNotGranted(market, "ROLE_CONTROLLER", marketRouter.address);
  await grantRoleIfNotGranted(marketRouter, "ROLE_CONTROLLER", owner.address);
  await grantRoleIfNotGranted(globalVaild, "GLOBAL_MGR_ROLE", owner.address);
  await grantRoleIfNotGranted(market, "ROLE_POS_KEEPER", owner.address);
  await grantRoleIfNotGranted(market, "MARKET_MGR_ROLE", owner.address);
  await grantRoleIfNotGranted(marketRouter, "MARKET_MGR_ROLE", market.address);
  await setPositionBook(positionBook.address);

  let execFee = numberToBigNumber(1);
  let liqFee = numberToBigNumber(1);
  await grantRoleIfNotGranted(
    allFee.feeRouter,
    "MARKET_MGR_ROLE",
    owner.address
  );
  await setFeeAndRates(market.address, [0, 0, 0, execFee, liqFee]);

  let size = ethers.utils.parseUnits(1000000000 + "", COLLATERAL_TOKEN_DECIMAL);
  await setMaxMarketSizeLimit(market.address, size);

  let addAsset = ethers.utils.parseUnits(
    10000000 + "",
    COLLATERAL_TOKEN_DECIMAL
  );
  await mint(lpContracts.vault.address, addAsset);
  console.log("---autoOrderOpenLong---");

  let autoOrderOpenLong = await deployAutoOrderMock(market.address, true, true);
  let autoOrderOpenShort = await deployAutoOrderMock(
    market.address,
    true,
    false
  );
  let autoOrderCloseLong = await deployAutoOrderMock(
    market.address,
    false,
    true
  );
  let autoOrderCloseShort = await deployAutoOrderMock(
    market.address,
    false,
    false
  );

  let autoLiqLong = await deployAutoLiqMock(market.address, true);
  let autoLiqShort = await deployAutoLiqMock(market.address, false);

  await grantRoleIfNotGranted(market, "ROLE_POS_KEEPER", autoLiqLong.address);

  await grantRoleIfNotGranted(market, "ROLE_POS_KEEPER", autoLiqShort.address);

  await grantRoleIfNotGranted(
    market,
    "ROLE_POS_KEEPER",
    autoOrderOpenLong.address
  );
  await grantRoleIfNotGranted(
    market,
    "ROLE_POS_KEEPER",
    autoOrderOpenShort.address
  );
  await grantRoleIfNotGranted(
    market,
    "ROLE_POS_KEEPER",
    autoOrderCloseLong.address
  );

  await grantRoleIfNotGranted(
    market,
    "ROLE_POS_KEEPER",
    autoOrderCloseShort.address
  );

  console.log("positionBook", await market.positionBook());

  return {
    factory: factory,
    USDC: USDC,
    lpContracts: lpContracts,
    allFee: allFee,
    positionBook: positionBook,
    orderBookLong: orderBookLong,
    orderBookShort: orderBookShort,
    marketVaild: marketVaild,
    priceFeed: priceFeed,
    positionAddMgr: positionAddMgr,
    positionSubMgr: positionSubMgr,
    orderMgr: orderMgr,
    indexToken: indexToken,
    globalVaild: globalVaild,
    collateralToken: collateralToken,
    market: market,
    marketReader: marketReader,
    marketRouter: marketRouter,
    autoOrderOpenLong: autoOrderOpenLong,
    autoOrderOpenShort: autoOrderOpenShort,
    autoOrderCloseLong: autoOrderCloseLong,
    autoOrderCloseShort: autoOrderCloseShort,
    autoLiqLong: autoLiqLong,
    autoLiqShort: autoLiqShort,
  };
}

async function deployTmpTestFactoryContract() {
  let factory = await deployMarketFactory();
  let USDC = await deployToken("USDC", "USDC");

  let lpContracts = await deployAllLp(USDC);

  let allFee = await deployFee(factory.address);
  await lpContracts.initLP({
    USDC: USDC,
    name: "USDC",
    symbol: "USDC",
    vault: lpContracts.vault,
    vaultRouter: lpContracts.vaultRouter,
    vaultReward: lpContracts.vaultReward,
    feeRouter: allFee.feeRouter,
    rewardDistributor: lpContracts.rewardDistributor,
  });
  let positionBook = await deployPositionBook(factory.address);
  let orderBookLong = await DB(factory.address, true, true);
  let orderBookShort = await DB(factory.address, true, false);
  let orderStoreOpenLong = await deployOrderStore(factory.address, true, "0");
  let orderStoreCloseLong = await deployOrderStore(factory.address, true, "1");
  let orderStoreOpenShort = await deployOrderStore(factory.address, true, "2");
  let orderStoreCloseShort = await deployOrderStore(factory.address, true, "3");
  // let orderBookLong = await deployOrderBook(factory.address, true);
  // let orderBookShort = await deployOrderBook(factory.address, false);
  let marketVaild = await deployMarketValid(factory.address);
  let priceFeed = await deployOracle();
  let positionAddMgr = await deployPositionAddMgr();
  let positionSubMgr = await deployPositionSubMgr();
  let orderMgr = await deployOrderMgr();
  let indexToken = addressjson["ETH"];
  let globalVaild = await deployGlobalValid(true);
  let marketRouter = await deployMarketRouter(factory.address);
  await initializeRouter(
    factory.address,
    globalVaild.address,
    lpContracts.vaultRouter.address
  );

  let collateralToken = USDC.address;
  let market = await deployMarket(factory.address);
  let marketReader = await deployMarketReader(factory.address);

  //access control
  {
    [owner, second, third] = await ethers.getSigners();

    await grantRoleIfNotGranted(factory, "MARKET_MGR_ROLE", owner.address);

    await grantRoleIfNotGranted(marketVaild, "MARKET_MGR_ROLE", market.address);

    await grantRoleIfNotGranted(
      marketRouter,
      "MARKET_MGR_ROLE",
      factory.address
    );

    await grantRoleIfNotGranted(marketRouter, "MARKET_MGR_ROLE", owner.address);
  }
  let arr = [
    positionBook.address,
    orderBookLong.address,
    orderBookShort.address,
    marketVaild.address,
    priceFeed.address,
    positionSubMgr.address,
    positionAddMgr.address,
    indexToken,
    allFee.feeRouter.address,
    marketRouter.address,
    lpContracts.vaultRouter.address,
    collateralToken,
    globalVaild.address,
    orderMgr.address,
  ];

  let inputs = buildCreateInputsParams({
    _name: "ETH",
    _marketAddress: market.address, //2
    addrs: arr,
    _openStoreLong: orderStoreOpenLong.address, //11
    _closeStoreLong: orderStoreCloseLong.address, //12
    _openStoreShort: orderStoreOpenShort.address, //13
    _closeStoreShort: orderStoreCloseShort.address, //14
    _minSlippage: 2,
    _maxSlippage: 300,
    _minLeverage: 2,
    _maxLeverage: 200,
    _maxTradeAmount: 10000,
    _minPay: 10,
    _minCollateral: 5,
    _allowOpen: true,
    _allowClose: true,
    _tokenDigits: 30,
  });

  await createMarket(inputs);
  //await addMarket(market.address, lpContracts.vault.address);
  await grantRoleIfNotGranted(
    lpContracts.vaultRouter,
    "MULTI_SIGN_ROLE",
    owner.address
  );
  await setMarket(market.address, lpContracts.vault.address);

  let execFee = numberToBigNumber(1);
  let liqFee = numberToBigNumber(1);
  await grantRoleIfNotGranted(
    allFee.feeRouter,
    "MARKET_MGR_ROLE",
    owner.address
  );
  await setFeeAndRates(market.address, [0, 0, 0, execFee, liqFee]);

  let size = ethers.utils.parseUnits(1000000000 + "", COLLATERAL_TOKEN_DECIMAL);
  await setMaxMarketSizeLimit(market.address, size);

  let addAsset = ethers.utils.parseUnits(
    10000000 + "",
    COLLATERAL_TOKEN_DECIMAL
  );
  await mint(lpContracts.vault.address, addAsset);

  console.log("---autoOrderOpenLong---");

  let autoOrderOpenLong = await deployAutoOrderMock(market.address, true, true);
  let autoOrderOpenShort = await deployAutoOrderMock(
    market.address,
    true,
    false
  );
  let autoOrderCloseLong = await deployAutoOrderMock(
    market.address,
    false,
    true
  );
  let autoOrderCloseShort = await deployAutoOrderMock(
    market.address,
    false,
    false
  );

  let autoLiqLong = await deployAutoLiqMock(market.address, true);
  let autoLiqShort = await deployAutoLiqMock(market.address, false);

  {
    await grantRoleIfNotGranted(market, "ROLE_POS_KEEPER", autoLiqLong.address);

    await grantRoleIfNotGranted(
      market,
      "ROLE_POS_KEEPER",
      autoLiqShort.address
    );

    await grantRoleIfNotGranted(
      market,
      "ROLE_POS_KEEPER",
      autoOrderOpenLong.address
    );
    await grantRoleIfNotGranted(
      market,
      "ROLE_POS_KEEPER",
      autoOrderOpenShort.address
    );
    await grantRoleIfNotGranted(
      market,
      "ROLE_POS_KEEPER",
      autoOrderCloseLong.address
    );

    await grantRoleIfNotGranted(
      market,
      "ROLE_POS_KEEPER",
      autoOrderCloseShort.address
    );
  }

  return {
    factory: factory,
    positionBook: positionBook,
    USDC: USDC,
    lpContracts: lpContracts,
    allFee: allFee,
    orderBookLong: orderBookLong,
    orderBookShort: orderBookShort,
    orderStoreOpenLong: orderStoreOpenLong,
    orderStoreCloseLong: orderStoreCloseLong,
    orderStoreCloseShort: orderStoreCloseShort,
    orderStoreOpenShort: orderStoreOpenShort,
    marketVaild: marketVaild,
    priceFeed: priceFeed,
    positionAddMgr: positionAddMgr,
    positionSubMgr: positionSubMgr,
    orderMgr: orderMgr,
    indexToken: indexToken,
    globalVaild: globalVaild,
    marketRouter: marketRouter,
    collateralToken: collateralToken,
    market: market,
    marketReader: marketReader,
    autoOrderOpenLong: autoOrderOpenLong,
    autoOrderOpenShort: autoOrderOpenShort,
    autoOrderCloseLong: autoOrderCloseLong,
    autoOrderCloseShort: autoOrderCloseShort,
    autoLiqLong: autoLiqLong,
    autoLiqShort: autoLiqShort,
  };
}

async function readServiceAllMarket() {
  let factory = await readMarketFactoryContract();
  let USDC = await readTokenContract();
  let lpContracts = await readLpContract();
  let allFee = await readAllFee();

  //todo
  let positionBook = await readPositionBookContract();
  console.log("readPositionAddMgrContract");

  let orderBookLong = await readOrderBook(true);
  console.log("readPositionAddMgrContract");
  let orderBookShort = await readOrderBook(false);

  let marketVaild = await readMarketValidContract();
  let priceFeed = await readOracleContract();
  //readPositionAddMgrContract
  console.log("readPositionAddMgrContract");
  let positionAddMgr = await readPositionAddMgrContract();
  let positionSubMgr = await readPositionSubMgrContract();

  let orderMgr = await readOrderMgrContract();
  let indexToken = addressjson["ETH"];
  let globalVaild = await readGlobalValidContract();

  let collateralToken = USDC.address;

  let market = await readMarketContract();
  let marketReader = await readMarketReaderContract();
  let marketRouter = await readMarketRouterContract();
  console.log("readPositionAddMgrContract");

  let autoOrderOpenLong = await readAutoOrderMock(true, true);
  let autoOrderOpenShort = await readAutoOrderMock(true, false);
  let autoOrderCloseLong = await readAutoOrderMock(false, true);
  let autoOrderCloseShort = await readAutoOrderMock(false, false);

  let autoLiqLong = await readAutoLiqMock(market.address, true);
  let autoLiqShort = await readAutoLiqMock(market.address, false);

  return {
    factory: factory,
    USDC: USDC,
    lpContracts: lpContracts,
    allFee: allFee,
    positionBook: positionBook,
    orderBookLong: orderBookLong,
    orderBookShort: orderBookShort,
    marketVaild: marketVaild,
    priceFeed: priceFeed,
    positionAddMgr: positionAddMgr,
    positionSubMgr: positionSubMgr,
    orderMgr: orderMgr,
    indexToken: indexToken,
    globalVaild: globalVaild,
    collateralToken: collateralToken,
    market: market,
    marketReader: marketReader,
    marketRouter: marketRouter,
    autoOrderOpenLong: autoOrderOpenLong,
    autoOrderOpenShort: autoOrderOpenShort,
    autoOrderCloseLong: autoOrderCloseLong,
    autoOrderCloseShort: autoOrderCloseShort,
    autoLiqLong: autoLiqLong,
    autoLiqShort: autoLiqShort,
  };
}
//Cancel all unexecuted orders and liquidate all user positions
async function execCancelOrderAndLiqPosition({
  users,
  market,
  orderBookLong,
  orderBookShort,
  indexToken,
}) {
  await setIsEnableMarketConvertToOrder(false);

  //Clear all user positions
  for (let index = 0; index < users.length; index++) {
    let ownerUser = users[index];
    //Flatten the user's long position
    {
      //Get multiple position from users
      let longPosition = await getCurrentPosition({
        user: ownerUser.address,
        price: 0,
        isLong: true,
      });
      //close a position

      if (longPosition.size.gt(0)) {
        let avgprice = longPosition.averagePrice;
        let price = parseInt(ethers.utils.formatUnits(avgprice, 30));
        await setPrice(indexToken, price);

        let decParams = buildDecreasePositionParam({
          market,
          price,
          isLong: true,
        });

        decParams._sizeDelta = longPosition.size;

        await connectDecreasePosition(ownerUser, decParams),
          await validSize({
            user: ownerUser.address,
            price: 0,
            isLong: true,
            size: 0,
          });
      }
    }

    // //Close the user's short order
    {
      let shortPosition = await getCurrentPosition({
        user: ownerUser.address,
        price: 0,
        isLong: false,
      });

      if (shortPosition.size.gt(0)) {
        let avgprice = shortPosition.averagePrice;
        let price = parseInt(ethers.utils.formatUnits(avgprice, 30));

        await setPrice(indexToken, price);
        let decParams = buildDecreasePositionParam({
          market,
          price,
          isLong: false,
        });
        decParams._sizeDelta = shortPosition.size;

        await connectDecreasePosition(ownerUser, decParams);

        await validSize({
          user: ownerUser.address,
          price: 0,
          isLong: false,
          size: 0,
        });
      }
    }

    {
      //Get how many pending orders the user has
      let orderArr = await getOrderByAccount(ownerUser.address, "0");

      for (let index = 0; index < orderArr.length; index++) {
        await connectCancelOrderList(
          ownerUser,
          [market],
          [true],
          [orderArr[index].orderID],
          [true]
        );
      }

      orderArr = await getOrderByAccount(ownerUser.address, "1");

      for (let index = 0; index < orderArr.length; index++) {
        await connectCancelOrderList(
          ownerUser,
          [market],
          [false],
          [orderArr[index].orderID],
          [true]
        );
      }

      orderArr = await getOrderByAccount(ownerUser.address, "2");

      for (let index = 0; index < orderArr.length; index++) {
        await connectCancelOrderList(
          ownerUser,
          [market],
          [true],
          [orderArr[index].orderID],
          [true]
        );
      }

      orderArr = await getOrderByAccount(ownerUser.address, "3");

      for (let index = 0; index < orderArr.length; index++) {
        await connectCancelOrderList(
          ownerUser,
          [market],
          [true],
          [orderArr[index].orderID],
          [false]
        );
      }
    }
  }
}

async function userMintAndApprove(from, mintAmount, to) {
  mintAmount = ethers.utils.parseUnits(mintAmount + "", 18);
  // console.log("from.address", from);
  await mint(from.address, mintAmount);
  await userApprove(from, to.address, mintAmount);
}

async function readContractOnChain() {
  let factory = await readMarketFactoryContract();
  //USDT
  let USDT = await readUSDCContract();
  let lpContracts = await readLpContract();
  let allFee = await readAllFee();
  let positionBook = await readPositionBookContract();

  let orderBookLong = await readOrderBook(true);
  let orderBookShort = await readOrderBook(false);
  let marketVaild = await readMarketValidContract();
  //priceFeed

  let chainPriceFeed = await readChainPriceContract();
  let fastPriceFeed = await readFastPriceContract();
  let price = await readPriceContract();

  let positionAddMgr = await readPositionAddMgrContract();
  let positionSubMgr = await readPositionSubMgrContract();

  let orderMgr = await readOrderMgrContract();

  let globalVaild = await readGlobalValidContract();
  let indexToken = await readIndexTokenAddressFromAPI();
  // let collateralToken = USDT.address;

  let market = await readMarketContract();
  let marketReader = await readMarketReaderContract();
  let marketRouter = await readMarketRouterContract();

  let autoOrderOpenLong = await readAutoOrderContract("", true, true);
  let autoOrderOpenShort = await readAutoOrderContract("", true, false);
  let autoOrderCloseLong = await readAutoOrderContract("", false, true);
  let autoOrderCloseShort = await readAutoOrderContract("", false, false);

  let autoLiqLong = await readAutoLiquidateContract("", true);
  let autoLiqShort = await readAutoLiquidateContract("", false);

  return {
    factory: factory,
    USDT: USDT,
    lpContracts: lpContracts,
    allFee: allFee,
    positionBook: positionBook,
    orderBookLong: orderBookLong,
    orderBookShort: orderBookShort,
    marketVaild: marketVaild,
    chainPriceFeed: chainPriceFeed,
    fastPriceFeed: fastPriceFeed,
    price: price,
    positionAddMgr: positionAddMgr,
    positionSubMgr: positionSubMgr,
    orderMgr: orderMgr,
    indexToken: indexToken,
    globalVaild: globalVaild,
    collateralToken: collateralToken,
    market: market,
    marketReader: marketReader,
    marketRouter: marketRouter,
    autoOrderOpenLong: autoOrderOpenLong,
    autoOrderOpenShort: autoOrderOpenShort,
    autoOrderCloseLong: autoOrderCloseLong,
    autoOrderCloseShort: autoOrderCloseShort,
    autoLiqLong: autoLiqLong,
    autoLiqShort: autoLiqShort,
  };
}

module.exports = {
  userMintAndApprove,
  deployServiceAllMarket,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
  deployTmpTestFactoryContract,
  readContractOnChain,
};
