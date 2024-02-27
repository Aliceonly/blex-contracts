const { readMarketContract } = require("../market/market")
const { readOrderMgrContract } = require("../market/orderMgr")
//=======
const { replacePositionAddMgr } = require("./positionAddMgr")
const { replacePositionSubMgr } = require("./positionSubMgr")
const { replaceOrderMgrContract } = require("./orderMgr")
const { replaceOrderBook } = require("./orderBook")
const { replaceFeeRouter } = require("./feeRouter")
const { uploadToTenderfly, grantRoleIfNotGranted, fetchContractAddresses } = require("../utils/helpers")
const { readOrderBookContract } = require("../order/orderBook")
const { replaceCoreVault } = require("./coreVault")
const { replaceVaultRouter } = require("./vaultRouter")
const { replaceVaultReward } = require("./vaultReward")
const { replaceMarketRouter } = require("./marketRouter")
const { replaceMarketValid } = require("./marketValid")
const { replaceRewardDistributor } = require("./rewardDistributor")
const { replaceMarketReader } = require("./marketReader")
const { OwnerAccountAddress } = require(`../../config/chain/${process.env.HARDHAT_NETWORK}/wallet.json`)
const { transferAdmin } = require("../utils/helpers")

async function getMarketContract(
    symbol,
    contractName = "Market",
    contractClass = "Market"
) {
    let data = await fetchContractAddresses()
    let marketAddr;
    let marketID
    for (let index = 0; index < data.length; index++) {
        const element = data[index];
        if (element.name == "Market") {
            marketAddr = element.address
            const contractFactory = await ethers.getContractFactory("Market")
            const market = await contractFactory.attach(marketAddr)
            if ((await market.name()) == symbol) {
                marketID = element.marketID
                break
            }
        }
    }

    for (let index = 0; index < data.length; index++) {
        const element = data[index];
        if (element.name == contractName && element.marketID == marketID) {
            const contractFactory = await ethers.getContractFactory(contractClass)
            return await contractFactory.attach(marketAddr)
        }
    }

}

async function upgradeAll() {

    const market_ETH = await getMarketContract("ETH/USD")
    const market_BTC = await getMarketContract("BTC/USD")
    await replacePositionAddMgr([market_ETH, market_BTC])

}

upgradeAll().catch((error) => {
    console.error(error)
    process.exitCode = 1
})


