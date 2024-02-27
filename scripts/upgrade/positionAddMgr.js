
const {
	deployOrConnect,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
	deployContract,
	hasRole,
	getDeployer
} = require("../utils/helpers");
const { deployPositionAddMgr } = require("../market/positionAddMgr")

async function replacePositionAddMgr(marketList) {
	const deployer = await getDeployer()
	for (let index = 0; index < marketList.length; index++) {
		const market = marketList[index];

		if ((await hasRole(market, "MARKET_MGR_ROLE", deployer.address)) == false) {
			console.log("role not granted. wallet:", deployer.address);
			return
		}
	}

	const mgr = await deployPositionAddMgr(true)
	for (let index = 0; index < marketList.length; index++) {
		const market = marketList[index];
		await handleTx(
			market.setPositionMgr(mgr.address, true),
			"market.setPositionMgr.true"
		)

	}
}

module.exports = {
	replacePositionAddMgr
};