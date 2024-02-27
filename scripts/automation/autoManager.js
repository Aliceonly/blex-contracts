const {
	deployContractAndReturnReceipt,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
} = require("../utils/helpers");

async function deployAutoManager(linkToken, writeJson) {
	const number_key = "AutoManager" + "_block";

	const { contract: autoManager, receipt } = await deployContractAndReturnReceipt("AutoManager", [linkToken]);

	const result = {
		AutoManager: autoManager.address,
		[number_key]: receipt.blockNumber,
	};
	if (writeJson) writeContractAddresses(result);

	return autoManager;
}

async function readAutoManagerContract() {
	const autoManager = await readDeployedContract("AutoManager");
	return autoManager
}

async function addAutoMation(id, registry, minAdd) {
	const autoManager = await readDeployedContract("AutoManager");

	await handleTx(
		autoManager.addAutoMation(id, registry, minAdd),
		"autoManager.addAutoMation"
	);
}

module.exports = {
	deployAutoManager,
	readAutoManagerContract,
	addAutoMation,
};
