const { deployPositionBook } = require("./position/positionBook")

const {
  readDeployedContract,
  handleTx,
  isLocalHost,
  grantRoleIfNotGranted,
  readContractAddresses
} = require("./utils/helpers")
const { deployMarket } = require("./deploy/addMarket")
const { setFeeAndRates } = require("./fee/feeRouter")
const { setPriceFeed } = require("./oracle/chainPriceFeed");
const { addPlugin: marketAddPlugin } = require("./market/market")
const { setMarketLP } = require("./lp/deploy")


async function runDeployMarket({ symbol = "ETH", isInit = false, results } = {}) {
  const network = process.env.HARDHAT_NETWORK || "local-dev"

  results = {
    ...results,

    name: symbol + "/USD"
  }

  const results2 = await deployMarket(results)
  const [wallet, user0, user1] = await ethers.getSigners()
  results = { ...results, ...results2 }
  await setMarketLP(results)

  await setFeeAndRates(
    results.market.address,
    [
      results.openFeeRate,
      results.closeFeeRate,
      results.fundFeeRate,
      results.execFee,
      results.liqFee
    ]
  )
  await handleTx(
    results.globalValid.setMaxMarketSizeLimit(
      results.market.address,
      ethers.utils.parseUnits(results.MaxMarketSizeLimit, 18)
    ),
    "globalValid.setMaxMarketSizeLimit"
  )

  await marketAddPlugin(results.market, results.referral.address)
  await grantRoleIfNotGranted(
    results.referral,
    "ROLE_CONTROLLER",
    results.market.address,
    "referral.grant.market"
  )

  await grantRoleIfNotGranted(
    results.market,
    "ROLE_POS_KEEPER",
    results.fastPrice.address,
    "market.grant.fastPrice"
  )
  /* 
  await grantRoleIfNotGranted(
    results.feeRouter,
    "MARKET_MGR_ROLE",
    "0x22b147A9e4E513d39775504EB7Db3D674D53d5dd",
    "feeRouter.grante.user"
  );
  await grantRoleIfNotGranted(
    results.rewardDistributor,
    "MANAGER_ROLE",
    "0x22b147A9e4E513d39775504EB7Db3D674D53d5dd",
    "rewardDistributor.grante.user"
  )
  */

  return results
}

module.exports = {
  runDeployMarket,
}
