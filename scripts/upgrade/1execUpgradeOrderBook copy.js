const { readMarketContract } = require("../market/market")
const { readOrderMgrContract } = require("../market/orderMgr")
//=======
const { replacePositionAddMgr } = require("./positionAddMgr")
const { replacePositionSubMgr } = require("./positionSubMgr")
const { replaceOrderMgrContract } = require("./orderMgr")
const { replaceOrderBook, executeUpgradeOrderBook } = require("./orderBook")
const { replaceFeeRouter } = require("./feeRouter")
const { getMarketContract } = require("../utils/helpers")

async function upgradeAll() {

    const market_ETH = await getMarketContract("ETH/USD")
    const market_BTC = await getMarketContract("BTC/USD")
    await executeUpgradeOrderBook([market_ETH, market_BTC], ["ETH", "BTC"])

}

upgradeAll().catch((error) => {
    console.error(error)
    process.exitCode = 1
})


