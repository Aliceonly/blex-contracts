const {
	deployOrConnect,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
} = require("../utils/helpers");

async function deployMockGlobalValid(writeJson) {
	const globalValid = await deployOrConnect("MockGlobalValid", []);

	const result = {
		MockGlobalValid: globalValid.address
	};
	if (writeJson)
		writeContractAddresses(result)

	return globalValid;
}

async function readMockGlobalValidContract() {
	const globalValid = await readDeployedContract("MockGlobalValid");
	return globalValid;
}


module.exports={
    deployMockGlobalValid,
    readMockGlobalValidContract,
}