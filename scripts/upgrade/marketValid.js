const {
	deployOrConnect,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
	fetchContractAddresses,
	grantRoleIfNotGranted
} = require("../utils/helpers");
const { deployMarketValid } = require("../market/marketValid");
const { ethers } = require("hardhat");

async function getFactoryAddress() {
	const datas = await fetchContractAddresses()
	let factory
	for (let i = 0; i < datas.length; i++) {
		const element = datas[i];
		if (element.name == 'MarketFactory') {
			factory = element.address
			break
		}
	}
	return factory
}

async function replaceMarketValid(marketList, symbols) {
	const factory = await getFactoryAddress()
	const deployer = new ethers.Wallet(process.env.TestnetPrivateKey)
	const newValidList = []
	for (let index = 0; index < marketList.length; index++) {
		const valid = await deployMarketValid(factory, false)
		newValidList.push(valid)
		const market = marketList[index];

		await grantRoleIfNotGranted(valid, "MARKET_MGR_ROLE", deployer.address)
		await grantRoleIfNotGranted(market, "MARKET_MGR_ROLE", deployer.address)
		await grantRoleIfNotGranted(valid, "MARKET_MGR_ROLE", market.address)
		console.log("market.setMarketValid", market.address, valid.address);
		await handleTx(
			market.setMarketValid(valid.address),
			"market.setMarketValid"
		)
	}
	return newValidList
}

module.exports = {
	replaceMarketValid
};