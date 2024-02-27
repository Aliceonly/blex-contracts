const { runDeployMarket } = require("./deploy_market")
const { deployBase } = require("./deploy_base")
const { readMarketReaderContract } = require("./market/marketReader")
const { readMarketRouterContract } = require("./market/marketRouter")
const { readMarketFactoryContract } = require("./market/marketFactory")
const { readVaultRouterContract } = require("./vault/vaultRouter")
const { handleTx, deployOrConnect, writeContractAddresses } = require("./utils/helpers")
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
    let priceConfig = require(`../config/parameters/price.json`)

    let collateralToken
    let addressConfig = require(`../config/chain/${process.env.HARDHAT_NETWORK}/address.json`)

    const feedsURLConfig = require(`../config/chain/${process.env.HARDHAT_NETWORK}/feedsURL.json`)

    let wallet = require(`../config/chain/${process.env.HARDHAT_NETWORK}/wallet.json`)
    if (false) {
        collateralToken = await deployOrConnect("USDC", ["USDT", "USDT", "100000000000000000000"], "USDT")
    } else {
        const ERC20Factory = await ethers.getContractFactory("USDC")
        collateralToken = await ERC20Factory.attach(addressConfig["USDT"])
    }
    writeContractAddresses({
        [await collateralToken.symbol()]: collateralToken.address
    })

    await deployBase({
        ...priceConfig,
        ...wallet,
        isInit: true,
        isFirstInit: true,
        USDC: collateralToken,
        feedsJsonAddress: feedsURLConfig.feeds,
        addressConfig
    })

}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})