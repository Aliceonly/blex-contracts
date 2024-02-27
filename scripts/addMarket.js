const { readFeeRouterContract } = require("./fee/feeRouter");
const { readGlobalValidContract } = require("./market/globalValid");
const { readMarketRouterContract } = require("./market/marketRouter");
const { readOrderMgrContract } = require("./market/orderMgr");
const { readPositionAddMgrContract } = require("./market/positionAddMgr");
const { readPositionSubMgrContract } = require("./market/positionSubMgr");
const { readVaultRouterContract, setMarket: setVaultRouterMarket } = require("./vault/vaultRouter");
const { createMarket } = require("./market/deploy");
const { readCoreVaultContract } = require("./vault/coreVault");
const { readOracleContract } = require("./oracle/price");
const { readMarketFactoryContract } = require("./market/marketFactory");

const {
	deployOrConnect,
	readDeployedContract,
	handleTx,
	writeContractAddresses,
} = require("./utils/helpers");
const { readVaultRewardContract } = require("./vault/vaultReward");

async function deploy() {
	const name = 'ETH/USD';
	const writeJson = true
	const indexToken = "0xEa0c41Fd13852a84052b4832d87BF995C95Ba8A4";



	const usdc = await deployOrConnect("USDC", ["USDC", "USDC", "100000000000000000000"])
	const collateralToken = usdc.address;
	const oracle = await deployOrConnect("MockOracle")

	const minSlippage = 1;
	const maxSlippage = 500;
	const minLeverage = 2;
	const maxLeverage = 200;
	const maxTradeAmount = 100000;
	const minPay = 10;
	const minCollateral = 5;
	const allowOpen = false;
	const allowClose = false;
	const tokenDigits = 18;


	const feeRouter = await readFeeRouterContract();
	const vaultRouter = await readVaultRouterContract();
	const positionSubMgr = await readPositionSubMgrContract();
	const positionAddMgr = await readPositionAddMgrContract();
	const marketRouter = await readMarketRouterContract();
	const globalValid = await readGlobalValidContract();
	const orderMgr = await readOrderMgrContract();
	const coreVault = await readCoreVaultContract();
	const factory = await readMarketFactoryContract();

	const contracts = {
		oracle: oracle.address,
		factory: factory.address,
		indexToken: indexToken,
		feeRouter: feeRouter.address,
		vaultRouter: vaultRouter.address,
		collateralToken: collateralToken,
		positionSubMgr: positionSubMgr.address,
		positionAddMgr: positionAddMgr.address,
		marketRouter: marketRouter.address,
		globalValid: globalValid.address,
		orderMgr: orderMgr.address,
	}
	const configs = {
		minSlippage: minSlippage,
		maxSlippage: maxSlippage,
		minLeverage: minLeverage,
		maxLeverage: maxLeverage,
		maxTradeAmount: maxTradeAmount,
		minPay: minPay,
		minCollateral: minCollateral,
		allowOpen: allowOpen,
		allowClose: allowClose,
		tokenDigits: tokenDigits
	}

	const results = await createMarket(name, contracts, configs, writeJson);
	await setVaultRouterMarket(results.market.address, coreVault.address);


	const [wallet, user0, user1] = await ethers.getSigners()
	const vaultReward = await readVaultRewardContract();









	return results;
}

deploy().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
