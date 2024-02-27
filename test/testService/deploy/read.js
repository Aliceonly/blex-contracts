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
  getMarketContract,
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
} = require("../../../scripts/market/marketRouter");

const { deployFee, readAllFee } = require("../../../scripts/fee/deployFeeAll");
const {
  deployAll: deployAllLp,
  readLpContract,
} = require("../../../scripts/lp/deploy");
const {
  deployMarketFactory,
  readMarketFactoryContract,
} = require("../../../scripts/market/marketFactory");
const {
  grantRoleIfNotGranted,
  fetchContractAddresses,
  writeContractAddresses,
} = require("../../../scripts/utils/helpers");
const {
  deployOracle,
  readOracleContract,
} = require("../../../scripts/mock/oracle");

const {
  deployToken,
  balanceOf,
  mint,
  userApprove,
  readTokenContract,
} = require("../../../scripts/mock/erc20");
const {
  deployMarketReader,
  readMarketReaderContract,
} = require("../../../scripts/market/marketReader");
const { initializeReader } = require("../../../scripts/market/marketReader");
const { setFeeAndRates } = require("../../../scripts/fee/feeRouter");
const { numberToBigNumber } = require("../utils/utils");
const { deployOrderRouter } = require("../../../scripts/market/orderRouter");
const {
  initializeOrderRouter,
} = require("../../../scripts/market/orderRouter");
const {
  orderRouterAddMarkets,
} = require("../../../scripts/market/orderRouter");
const { readCoreVaultContract } = require("../../../scripts/vault/coreVault");
const {
  readServiceAllMarket,
  readContractOnChain,
} = require("./deployAllContract");

const fs = require("fs");

const addressjson = {
  ETH: "0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08",
  BTC: "0x6550bc2301936011c1334555e62A87705A81C12C",
};

async function main() {
  let result = await readContractOnChain();

  // console.log(result);
}
// async function main() {
//   // let x = await readServiceAllMarket();

//   let data = await fetchContractAddresses();

//   for (let index = 0; index < data.length; index++) {
//     let element = data[index];
//     let result = {
//       [element.name]: element.address,
//     };
//     writeContractAddresses(result);
//   }
//   //  let data = await getMarketContract();
//   // const tmpAddresses = Object.assign(readContractAddresses(), json);
//   // for (let index = 0; index < data.length; index++) {
//   //   fs.writeFileSync("./2.json", JSON.stringify(data[index].name));
//   // }

//   // console.log("x", data.address);
// }

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
