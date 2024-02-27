const {
	deployOrConnect,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
	upgradeContract
} = require("../utils/helpers");
const { readMarketValidContract, deployMarketValid } = require("../market/marketValid");
const { deployMarketReader, readMarketReaderContract, initializeReader } = require("../market/marketReader");
const { readMarketFactoryContract } = require("../market/marketFactory");
const { readMarketRouterContract } = require("../market/marketRouter");
const { readVaultRouterContract } = require("../vault/vaultRouter");

async function replaceMarketReader({ } = {}) {
	// await upgradeContract("CoreVault")
	const marketFactory = await readMarketFactoryContract()
	const oldReader = await readMarketReaderContract()

	await deployMarketReader(marketFactory.address, true)

	const marketRouter = await readMarketRouterContract()
	const vaultRouter = await readVaultRouterContract()
	await initializeReader(marketRouter.address, vaultRouter.address)

}

module.exports = {
	replaceMarketReader
};