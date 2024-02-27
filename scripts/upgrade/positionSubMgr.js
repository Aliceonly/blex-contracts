const {
	deployOrConnect,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
	hasRole,
	getDeployer
} = require("../utils/helpers");
const { deployPositionSubMgr } = require("../market/positionSubMgr")

async function replacePositionSubMgr(marketList) {

	const deployer = await getDeployer()
	for (let index = 0; index < marketList.length; index++) {
		const market = marketList[index];

		if ((await hasRole(market, "MARKET_MGR_ROLE", deployer.address)) == false) {
			console.log("role not granted. wallet:", deployer.address);
			return
		}
	}

	const mgr = await deployPositionSubMgr(true)
	for (let index = 0; index < marketList.length; index++) {
		const market = marketList[index];
		await handleTx(
			market.setPositionMgr(mgr.address, false),
			"market.setPositionMgr.true"
		)
	}
}

module.exports = {
	replacePositionSubMgr
};