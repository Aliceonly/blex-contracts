// const { ethers } = require("hardhat");
// const {
//   readServiceAllMarket,
//   userMintAndApprove,
//   deployServiceAllMarket,
//   execCancelOrderAndLiqPosition,
//   deployTmpTestFactoryContract,
// } = require("../../../deploy/deployAllContract");
// const { execPrePare } = require("../../../utils/buildLogic");
// const {
//   buildIncreasePositionParam,
//   buildFees,
//   buildDecreaseOrderParam,
//   buildIncreaseOrderParam,
//   buildCreateInputsParams,
// } = require("../../../utils/buildParams");
// const {
//   validSize,
//   validBalanceChange,
//   validTransfer,
//   vaildUpdatePositionEvent,
//   vaildOrderExist,
//   validCollateral,
//   validPnl,
//   validAvgPrice,
// } = require("../../../utils/vaildData");
// const {
//   getSize,
//   getCurrentPosition,
//   calcOpenFee,
//   totalFees,
//   calcCollateral,
//   getCollateral,
//   calcCloseFee,
//   numberToBigNumber,
//   getOrderInfo,
//   calcPNL,
//   priceToBigNumber,
//   calcSlippagePrice,
//   calAveragePrice,
// } = require("../../../utils/utils");
// const {
//   getCumulativeFundingRates,
// } = require("../../../../../scripts/fee/feeVault");
// const { getFundingFee } = require("../../../utils/fundingFee");
// const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
// const {
//   vaildPosition,
//   getDecreaseDeltaCollateral,
//   vaildDecreaseOrder,
//   validateLiquidation,
// } = require("../../../utils/vaildPosition");
// const {
//   getMarketFundsUsed,
// } = require("../../../../../scripts/vault/vaultRouter");
// const { balanceOf } = require("../../../../../scripts/mock/erc20");
// const {
//   increasePosition,
//   connectUpdateOrder,
//   updateOrder,
// } = require("../../../../../scripts/market/marketRouter");
// const {
//   ordersIndex,
//   getAccountOrderNumber,
// } = require("../../../../../scripts/order/orderStore");
// const {
//   vaildUpdateOrderEvent,
//   vaildIncreaseOrder,
//   vaildOrderCreated,
//   vaildDeleteOrderEvent,
// } = require("../../../utils/vaildOrder");
// const { expect } = require("chai");
// const { BigNumber, providers } = require("ethers");
// const {
//   checkIndexAutoLiqMock,
//   performIndexAutoLiqMock,
// } = require("../../../../../scripts/am/autoLiqMock");
// const {
//   getMarketReader,
//   getMarketsReader,
// } = require("../../../../../scripts/market/marketReader");
// const { Provider } = require("@ethersproject/providers");
// const {
//   getMarketNumber,
//   createMarket,
// } = require("../../../../../scripts/market/marketFactory");
// const {
//   grantRoleIfNotGranted,
// } = require("../../../../../scripts/utils/helpers");

// describe("auto", async () => {
//   let allContracts;
//   let owner, second, third;
//   beforeEach(async () => {
//     allContracts = await deployTmpTestFactoryContract();
//     console.log(allContracts.marketRouter.address);

//     [owner, second, third] = await ethers.getSigners();

//     await grantRoleIfNotGranted(
//       allContracts.factory,
//       "MARKET_MGR_ROLE",
//       owner.address
//     );

//     await grantRoleIfNotGranted(
//       allContracts.marketRouter,
//       "MARKET_MGR_ROLE",
//       allContracts.factory.address
//     );

//     await grantRoleIfNotGranted(
//       allContracts.marketRouter,
//       "MARKET_MGR_ROLE",
//       owner.address
//     );

//     await grantRoleIfNotGranted(
//       allContracts.market,
//       "ROLE_CONTROLLER",
//       allContracts.marketRouter.address
//     );
//     await grantRoleIfNotGranted(
//       allContracts.positionBook,
//       "ROLE_CONTROLLER",
//       allContracts.factory.address
//     );
//     // await execCancelOrderAndLiqPosition({
//     //   users: [owner, second, third],
//     //   orderBookLong: allContracts.orderBookLong,
//     //   orderBookShort: allContracts.orderBookShort,
//     //   market: allContracts.market.address,
//     //   indexToken: allContracts.indexToken,
//     //});
//   });


//     let arr = [
//       allContracts.positionBook.address,
//       allContracts.orderBookLong.address,
//       allContracts.orderBookShort.address,
//       allContracts.marketVaild.address,
//       allContracts.priceFeed.address,
//       allContracts.positionSubMgr.address,
//       allContracts.positionAddMgr.address,
//       allContracts.indexToken,
//       allContracts.allFee.feeRouter.address,
//       allContracts.marketRouter.address,
//       allContracts.lpContracts.vaultRouter.address,
//       allContracts.collateralToken,
//       allContracts.globalVaild.address,
//       allContracts.orderMgr.address,
//     ];

//     let inputs = buildCreateInputsParams({
//       _name: "ETH",
//       _marketAddress: allContracts.market.address, //2
//       addrs: arr,
//       _openStoreLong: allContracts.orderStoreOpenLong.address, //11
//       _closeStoreLong: allContracts.orderStoreCloseLong.address, //12
//       _openStoreShort: allContracts.orderStoreOpenShort.address, //13
//       _closeStoreShort: allContracts.orderStoreCloseShort.address, //14
//       _minSlippage: 2,
//       _maxSlippage: 300,
//       _minLeverage: 2,
//       _maxLeverage: 200,
//       _maxTradeAmount: 10000,
//       _minPay: 10,
//       _minCollateral: 5,
//       _allowOpen: true,
//       _allowClose: true,
//       _tokenDigits: 30,
//     });
//     console.log("------------------------------");
//     //
//     await createMarket(inputs);

//     let data = await getMarketsReader();
//     console.log(await getMarketNumber());

//     console.log("data", data[0].minPay);
//     expect(data[0].minPay).to.be.eq(ethers.utils.parseUnits(10 + "", 18));
//   });
// });
