const { prepareUpgradeOrderBook } = require("./orderBook")
const { uploadToTenderfly, grantRoleIfNotGranted, fetchContractAddresses, getMarketContract } = require("../utils/helpers")
const { OwnerAccountAddress } = require(`../../config/chain/${process.env.HARDHAT_NETWORK}/wallet.json`)
const { transferAdmin } = require("../utils/helpers")

async function upgradeAll() {

    const market_ETH = await getMarketContract("ETH/USD")
    const market_BTC = await getMarketContract("BTC/USD")

    const newValidList = await prepareUpgradeOrderBook([market_ETH, market_BTC], ["ETH", "BTC"])
    for (let index = 0; index < newValidList.length; index++) {
        const element = newValidList[index];
        while (true) {
            try {
                await transferAdmin(element, OwnerAccountAddress, "transferAdmin")
                break
            } catch (error) { }
        }
    }

}

upgradeAll().catch((error) => {
    console.error(error)
    process.exitCode = 1
})


