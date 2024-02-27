const {
	deployContractAndReturnReceipt,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
} = require("../utils/helpers");

async function deployAutoPrice(tokenName, linkToken, APIOracle, fee, writeJson) {
	const key = "AutoPrice" + tokenName;
	const number_key = key + "_block";

	const { contract: autoPrice, receipt } = await deployContractAndReturnReceipt(
		"AutoPrice",
		[linkToken, APIOracle, fee],
		key
	);

	const result = {
		[key]: autoPrice.address,
		[number_key]: receipt.blockNumber,
	};
	if (writeJson) writeContractAddresses(result);

	return autoPrice;
}

async function readAutoPriceContract(tokenName) {
	const key = "AutoPrice" + tokenName;
	const autoPrice = await readDeployedContract(key);
	return autoPrice
}

async function autoPriceSetFastPriceFeed(tokenName, fastPriceFeedAddr) {
	const autoPrice = await readAutoPriceContract(tokenName);

	await handleTx(
		autoPrice.setFastPriceFeed(fastPriceFeedAddr),
		"autoPrice.setFastPriceFeed"
	)
}

async function autoPriceSetToken(tokenName, token, url, path) {
	const autoPrice = await readAutoPriceContract(tokenName);

	await handleTx(
		autoPrice.setToken(token, url, path),
		"autoPrice.setToken"
	)
}

module.exports = {
	deployAutoPrice,
	readAutoPriceContract,
	autoPriceSetFastPriceFeed,
	autoPriceSetToken,
};
