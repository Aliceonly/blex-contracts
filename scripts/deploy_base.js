const {
  deployAll: deployAllMarket,
  initialize: initializeMarket,
} = require("./deploy/init");
const { ethers } = require("hardhat");
const { deployGlobalValid } = require("./deploy/GlobalValid");
const {
  deleteAddressJson,
  deployOrConnect,
  isLocalHost,
  grantRoleIfNotGranted,
  getDeployer,
  revokeRoleIfGranted,
  handleTx,
  fetchJson,
} = require("./utils/helpers");

const { deployAll: deployAllLP } = require("./lp/deploy");
const { deployFee } = require("./fee/deployFeeAll");
const { deployReferral } = require("./referral/deploy");
const network = process.env.HARDHAT_NETWORK || "local-dev";
const addressjson = `./../config/${network}.json`;
console.log(addressjson);
const { LINK } = require(addressjson);
const { deployOracle } = require("./oracle/deploy");
const {
  setMaxTimeDeviation,
  setPriceDataInterval,
  setFastPriceIsSpreadEnabled,
} = require("./oracle/fastPriceFeed");
const { setFastPriceEnabled } = require("./oracle/price");
const { deployAutoManager } = require("./automation/autoManager");
require("dotenv").config();

async function deployBase({
  USDC,
  priceDuration = 300,
  maxPriceUpdateDelay = 3600,
  minBlockInterval = 0,
  maxDeviationBasisPoints = 1000,
  maxTimeDeviation = 600,
  priceDataInterval = 60,
  fastPriceIsSpreadEnabled,
  fastPriceEnabled,
  isInit = true,
  isFirstInit = false,
  marketMgrWalletAddress,
  feedsJsonAddress,
  addressConfig,
  oracleMgrWalletAddress,
} = {}) {
  if (process.env.HARDHAT_NETWORK == "local-dev") deleteAddressJson();
  const [wallet, user0, user1] = await ethers.getSigners();
  const globalValid = await deployGlobalValid(true);
  const lpContracts = await deployAllLP(USDC);
  let inputs = await deployAllMarket({
    deployer: wallet,
    vaultRouter: lpContracts.vaultRouter,
  });
  const feeContracts = await deployFee(
    inputs.marketFactory.address,
    true,
    isInit
  );
  await grantRoleIfNotGranted(
    feeContracts.feeRouter,
    "ROLE_CONTROLLER",
    lpContracts.vaultRouter.address
  );
  await grantRoleIfNotGranted(
    feeContracts.feeRouter,
    "ROLE_CONTROLLER",
    lpContracts.vaultReward.address
  );
  await grantRoleIfNotGranted(
    feeContracts.feeRouter,
    "ROLE_CONTROLLER",
    lpContracts.vault.address
  );

  const configs = {
    priceDuration: priceDuration,
    maxPriceUpdateDelay: maxPriceUpdateDelay,
    minBlockInterval: minBlockInterval,
    maxDeviationBasisPoints: maxDeviationBasisPoints,
  };
  let oracleContracts;

  if (process.env.HARDHAT_NETWORK == "local-dev") {
    const fastPrice = await deployOrConnect("MockOracle");
    oracleContracts = {
      fastPrice: fastPrice,
      priceFeed: fastPrice,
    };
  } else {
    oracleContracts = await deployOracle(configs, true, isFirstInit);

    const chainlinkFeeds = require(`./../config/feeds-${process.env.HARDHAT_NETWORK}.json`);
    await grantRoleIfNotGranted(
      oracleContracts.chainPrice,
      "MANAGER_ROLE",
      (
        await getDeployer()
      ).address
    );






    for (let index = 0; index < chainlinkFeeds.length; index++) {
      try {
        if (chainlinkFeeds.hasOwnProperty(index)) {
          const element = chainlinkFeeds[index];
          if (addressConfig.hasOwnProperty(element.name)) {
            const _token = addressConfig[element.name];
            console.log(_token, element["proxyAddress"], element["decimals"]);
            await handleTx(
              oracleContracts.chainPrice.setPriceFeed(
                _token,
                element["proxyAddress"],
                element["decimals"]
              ),
              "oracleContracts.chainPrice.setPriceFeed"
            );
          }
        }
      } catch (error) {
        console.log("error/failed");
        console.log(error);
      }
    }

    await revokeRoleIfGranted(
      oracleContracts.chainPrice,
      "MANAGER_ROLE",
      (
        await getDeployer()
      ).address
    );

    if (isFirstInit) {

      await setMaxTimeDeviation(maxTimeDeviation);
      await setPriceDataInterval(priceDataInterval);
      await setFastPriceIsSpreadEnabled(fastPriceIsSpreadEnabled);
      await setFastPriceEnabled(fastPriceEnabled);

    }
  }

  inputs = {
    ...inputs,
    ...feeContracts,
    ...lpContracts,
    ...oracleContracts,
    USDC: USDC,
    globalValid: globalValid,
  };

  if (isInit) {
    await initializeMarket(inputs);
    await lpContracts.initLP({
      ...inputs,
      name: "BLP",
      symbol: "BLP",
    });
  }
  const referralContracts = await deployReferral();
  const autoManager = await deployAutoManager(LINK, true);

  if (0) {
    ///////////
    await grantRoleIfNotGranted(
      globalValid,
      "ROLE_CONTROLLER",
      marketMgrWalletAddress
    );
  } else
    await grantRoleIfNotGranted(
      globalValid,
      "GLOBAL_MGR_ROLE",
      marketMgrWalletAddress
    );

  //========================================================================

  //========================================================================
  await grantRoleIfNotGranted(
    inputs.vault,
    "MANAGER_ROLE",
    marketMgrWalletAddress
  );
  await grantRoleIfNotGranted(
    inputs.fundFee,
    "MANAGER_ROLE",
    marketMgrWalletAddress,
    "inputs.fundFee.grantRole"
  );
  try {
    await grantRoleIfNotGranted(
      inputs.marketRouter,
      "MARKET_MGR_ROLE",
      inputs.marketFactory.address,
      "inputs.fundFee.grantRole"
    );
  } catch (error) {
    console.log("error inputs.fundFee.grantRole");
  }

  const marketGrants = [
    referralContracts.referral,

    inputs.marketFactory,
    inputs.feeRouter,
  ];
  for (let index = 0; index < marketGrants.length; index++) {
    const _e = marketGrants[index];
    await grantRoleIfNotGranted(_e, "MARKET_MGR_ROLE", marketMgrWalletAddress);
  }

  //========================================================================

  //========================================================================










  //========================
  return {
    ...inputs,
    ...referralContracts,
    autoManager,
    feeRouter: feeContracts.feeRouter,
    rewardDistributor: lpContracts.rewardDistributor,
  };
}

module.exports = {
  deployBase,
};





