const {
	deployOrConnect,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
	upgradeContract
} = require("../utils/helpers");
const { readMarketValidContract, deployMarketValid } = require("../market/marketValid")

async function replaceVaultRouter({ } = {}) {
	await upgradeContract("VaultRouter")
}

module.exports = {
	replaceVaultRouter
};