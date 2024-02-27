const {
  deployAll: deployAllMarket,
  initialize: initializeMarket,
} = require("./deploy/init")
const { ethers } = require("hardhat")
const { deployGlobalValid } = require("./deploy/GlobalValid")
const {
  deleteAddressJson,
  deployOrConnect,
  isLocalHost,
  grantRoleIfNotGranted,
  getDeployer,
  revokeRoleIfGranted,
  handleTx,
  fetchJson
} = require("./utils/helpers")

const { deployAll: deployAllLP } = require("./lp/deploy")
const { deployFee } = require("./fee/deployFeeAll")
const { deployReferral } = require("./referral/deploy")
const network = process.env.HARDHAT_NETWORK || "local-dev"
const addressjson = `./../config/${network}.json`
console.log(addressjson);
const { LINK } = require(addressjson)
const { deployOracle } = require("./oracle/deploy")
const { setMaxTimeDeviation, setPriceDataInterval, setFastPriceIsSpreadEnabled } = require("./oracle/fastPriceFeed")
const { setFastPriceEnabled } = require("./oracle/price");
const { deployAutoManager } = require("./automation/autoManager");
const { readChainPriceContract } = require("./oracle/chainPriceFeed")
require("dotenv").config();

async function deployBase() {






















  const chainlinkFeeds = require(`./../config/feeds-${process.env.HARDHAT_NETWORK}.json`)

  let addressConfig = require(`./../config/${process.env.HARDHAT_NETWORK}.json`)
  const chainPriceContract = await readChainPriceContract()
  for (let index = 0; index < chainlinkFeeds.length; index++) {
    try {
      const element = chainlinkFeeds[index];
      const _token = addressConfig[element.name]
      console.log(_token, element["proxyAddress"], element["decimals"])
      await handleTx(
        chainPriceContract.setPriceFeed(_token, element["proxyAddress"], element["decimals"]),
        "oracleContracts.chainPrice.setPriceFeed"
      )
    } catch (error) {
      console.log(error);
    }
  }














































































}

module.exports = {
  deployBase,
}

deployBase().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
