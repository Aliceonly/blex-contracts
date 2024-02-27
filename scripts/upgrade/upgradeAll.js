const { readMarketContract } = require("../market/market")
const { readOrderMgrContract } = require("../market/orderMgr")
//=======
const { replacePositionAddMgr } = require("../upgrade/positionAddMgr")
const { replacePositionSubMgr } = require("../upgrade/positionSubMgr")
const { replaceOrderMgrContract } = require("../upgrade/orderMgr")
const { replaceOrderBook } = require("../upgrade/orderBook")
const { replaceFeeRouter } = require("../upgrade/feeRouter")
const { uploadToTenderfly, grantRoleIfNotGranted, fetchContractAddresses } = require("../utils/helpers")
const { readOrderBookContract } = require("../order/orderBook")
const { replaceCoreVault } = require("../upgrade/coreVault")
const { replaceVaultRouter } = require("../upgrade/vaultRouter")
const { replaceVaultReward } = require("../upgrade/vaultReward")
const { replaceMarketRouter } = require("../upgrade/marketRouter")
const { replaceMarketValid } = require("../upgrade/marketValid")
const { replaceRewardDistributor } = require("../upgrade/rewardDistributor")
const { replaceMarketReader } = require("./marketReader")

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

    console.log(new Date())
    // await replaceMarketReader({})
    // await replaceVaultRouter({})
    // await replaceRewardDistributor()
    // await replaceVaultReward({})
    // await replaceCoreVault({})

    const market_ETH = await getMarketContract("ETH/USD")
    console.log(market_ETH.address);

    const market_BTC = await getMarketContract("BTC/USD")
    console.log(market_BTC.address);

    // await replaceMarketValid([market_BTC], ["BTC"])

    await replaceMarketValid([market_ETH, market_BTC], ["ETH", "BTC"])

    // await replaceOrderMgrContract([market_ETH])
    // await replacePositionAddMgr([market_ETH])
    // await replacePositionSubMgr([market_ETH])

    // await replaceMarketRouter({})
    // await replaceOrderBook([market_ETH], ["ETH"])
    // await replaceFeeRouter()

}

upgradeAll().catch((error) => {
    console.error(error)
    process.exitCode = 1
})


