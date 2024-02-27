const {
	deployContract,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
	grantRoleIfNotGranted,
	hasRole,
	getDeployer
} = require("../utils/helpers");

const { readMarketFactoryContract } = require("../market/marketFactory")
const { deployOrderBook, readOrderBookContract } = require("../order/orderBook")
const { setOrderBooks } = require("../market/market")
const { readOrderStoreContract, readOrderStoreContractFromAPI } = require("../order/orderStore")
const { initializeOrderBook } = require("../order/orderBook");

async function tryUntilSuccess() {

}

async function prepareUpgradeOrderBook(marketList, symbols) {
	const deployer = await getDeployer()
	for (let index = 0; index < marketList.length; index++) {
		const market = marketList[index];
		if ((await hasRole(market, "MARKET_MGR_ROLE", deployer.address)) == false) {
			console.log("role not granted. wallet:", deployer.address);
			return
		}
	}
	const obssss = []
	const marketFac = await readMarketFactoryContract()
	for (let index = 0; index < marketList.length; index++) {
		const symbol = symbols[index];
		const market = marketList[index]
		let ob0, ob1
		while (true) {
			try {
				ob0 = await deployOrderBook(marketFac.address, true, true, symbol)
				break
			} catch (error) { }
		}

		while (true) {
			try {
				await grantRoleIfNotGranted(ob0, "ROLE_CONTROLLER", market.address, "grant xxxx")
				break
			} catch (error) { }
		}

		while (true) {
			try {
				ob1 = await deployOrderBook(marketFac.address, true, false, symbol)
				break
			} catch (error) { }
		}

		while (true) {
			try {
				await grantRoleIfNotGranted(ob1, "ROLE_CONTROLLER", market.address, "grant xxxx")
				break
			} catch (error) { }
		}
		obssss.push(ob0)
		obssss.push(ob1)
	}
	return obssss
}

async function executeUpgradeOrderBook(marketList, symbols) {
	for (let index = 0; index < marketList.length; index++) {
		const market = marketList[index]
		const symbol = symbols[index];
		const ob0 = await readOrderBookContract({ isLong: true, symbol })
		const ob1 = await readOrderBookContract({ isLong: false, symbol })
		while (true) {
			try {
				await setOrderBooks(market, ob0.address, ob1.address)
				break
			} catch (error) { }
		}
	}
}

async function checkOrderBookRoles(marketList, symbols) {
	for (let index = 0; index < marketList.length; index++) {
		const market = marketList[index];
		const symbol = symbols[index];
		const ob0 = await readOrderBookContract({ isLong: true, symbol })
		const ob1 = await readOrderBookContract({ isLong: false, symbol })
		const obs = [ob0, ob1]
		for (let j = 0; j < obs.length; j++) {
			const ob = obs[j];
			const isLong = j == 0
			const isOpens = [true, false]
			for (let k = 0; k < isOpens.length; k++) {
				const isOpen = isOpens[k];
				const os = await readOrderStoreContractFromAPI({
					symbol: symbol,
					isLong: isLong,
					isOpen: isOpen
				})
				if (false == (await hasRole(os, "ROLE_CONTROLLER", ob.address))) {
					throw new Error(`ROLE_CONTROLLER misssing. orderstore: ${os.address} , orderbook: ${ob.address} , symbol: ${symbol}`);
				}
			}
			if (false == (await hasRole(ob, "ROLE_CONTROLLER", market.address))) {
				throw new Error(`ROLE_CONTROLLER misssing. orderbook: ${ob.address}. market: ${market.address}`);
			}
		}
	}
}

module.exports = {
	prepareUpgradeOrderBook,
	executeUpgradeOrderBook,
	checkOrderBookRoles
};