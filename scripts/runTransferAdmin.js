const { readMarketReaderContract } = require("./market/marketReader")
const { readMarketRouterContract } = require("./market/marketRouter")
const { readMarketFactoryContract } = require("./market/marketFactory")
const { readVaultRouterContract } = require("./vault/vaultRouter")
const { readReferral } = require("./referral/deploy")
const { readFastPriceContract } = require("./oracle/fastPriceFeed")
const { readCoreVaultContract } = require("./vault/coreVault")
const { readVaultRewardContract } = require("./vault/vaultReward")
const { readOracleContract } = require("./oracle/price")
const { readFeeRouterContract } = require("./fee/feeRouter")
const { readGlobalValidContract } = require("./deploy/GlobalValid")
const { readRewardDistributorContract } = require("./vault/rewardDistributor")
const { readFeeVaultContract } = require("./fee/feeVault")
const { readFundFeeContract } = require("./fee/fundFee")
const { transferAdmin } = require("./utils/helpers")
const { readChainPriceContract } = require("./oracle/chainPriceFeed")

const { OwnerAccountAddress } = require(`../config/chain/${process.env.HARDHAT_NETWORK}/wallet.json`)

async function _transferAdmin(results) {

    await transferAdmin(results.vault, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.vaultReward, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.vaultRouter, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.rewardDistributor, OwnerAccountAddress, "transferAdmin")

    await transferAdmin(results.feeRouter, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.feeVault, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.fundFee, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.referral, OwnerAccountAddress, "transferAdmin")

    await transferAdmin(results.marketRouter, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.marketReader, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.marketFactory, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.globalValid, OwnerAccountAddress, "transferAdmin")

    await transferAdmin(results.priceFeed, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.fastPrice, OwnerAccountAddress, "transferAdmin")
    await transferAdmin(results.chainPriceFeed, OwnerAccountAddress, "transferAdmin")
}

async function main() {
    console.log(new Date())
    const results = {
        referral: await readReferral(),
        fastPrice: await readFastPriceContract(),
        priceFeed: await readOracleContract(),
        vault: await readCoreVaultContract(),
        vaultRouter: await readVaultRouterContract(),
        vaultReward: await readVaultRewardContract(),
        marketFactory: await readMarketFactoryContract(),
        feeRouter: await readFeeRouterContract(),
        feeVault: await readFeeVaultContract(),
        fundFee: await readFundFeeContract(),
        marketRouter: await readMarketRouterContract(),
        marketReader: await readMarketReaderContract(),
        globalValid: await readGlobalValidContract(),
        chainPriceFeed: await readChainPriceContract(),
        rewardDistributor: await readRewardDistributorContract()
    }

    // transfer admin to another account
    await _transferAdmin(results)

}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})