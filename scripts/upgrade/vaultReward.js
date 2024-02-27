const { upgradeContract } = require("../utils/helpers");

async function replaceVaultReward({ } = {}) {
	await upgradeContract("VaultReward")
}

module.exports = {
	replaceVaultReward
};