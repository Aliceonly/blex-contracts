const { runDeployMarket } = require("./deploy_market")
const { deployBase } = require("./deploy_base")
const { readMarketReaderContract } = require("./market/marketReader")
const { readMarketRouterContract } = require("./market/marketRouter")
const { readMarketFactoryContract } = require("./market/marketFactory")
const { readVaultRouterContract } = require("./vault/vaultRouter")
const { handleTx, deployOrConnect } = require("./utils/helpers")
const { readReferral } = require("./referral/deploy")
const { readFastPriceContract } = require("./oracle/fastPriceFeed")
const { readCoreVaultContract } = require("./vault/coreVault")
const { readVaultRewardContract } = require("./vault/vaultReward")
const { readOracleContract } = require("./oracle/price")
const { readOrderMgrContract } = require("./market/orderMgr")
const { readPositionAddMgrContract } = require("./market/positionAddMgr")
const { readPositionSubMgrContract } = require("./market/positionSubMgr")
const { readFeeRouterContract } = require("./fee/feeRouter")
const { readGlobalValidContract } = require("./deploy/GlobalValid")


async function main() {
    console.log(new Date())
    const marketConfig = require("../config/ETHUSD.json")
    let collateralToken
    const addressConfig = require(`./../config/${process.env.HARDHAT_NETWORK}.json`)
    if (false) {
        collateralToken = await deployOrConnect("USDC", ["USDC", "USDC", "100000000000000000000"])
    } else {
        const ERC20Factory = await ethers.getContractFactory("USDC")
        collateralToken = await ERC20Factory.attach(addressConfig["USDT"])
    }

    const results = {
        ...marketConfig,
        referral: await readReferral(),
        fastPrice: await readFastPriceContract(),
        vault: await readCoreVaultContract(),
        vaultRouter: await readVaultRouterContract(),
        vaultReward: await readVaultRewardContract(),
        marketFactory: await readMarketFactoryContract(),
        priceFeed: await readOracleContract(),
        orderMgr: await readOrderMgrContract(),
        positionAddMgr: await readPositionAddMgrContract(),
        positionSubMgr: await readPositionSubMgrContract(),
        indexToken: addressConfig[marketConfig.name2],
        feeRouter: await readFeeRouterContract(),
        marketRouter: await readMarketRouterContract(),
        collateralToken: collateralToken,
        globalValid: await readGlobalValidContract()
    }

    await runDeployMarket({
        results: results,
        symbol: marketConfig.symbol
    })

}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})