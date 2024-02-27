const {
  deployContract,
  deployOrConnect,
  readDeployedContract2,
  readDeployedContract,
  handleTx,
  writeContractAddresses,
  readContractAddresses,
  deployContractAndReturnReceipt,
  fetchContractAddresses,
} = require("../utils/helpers");
async function deployMarketValid(factoryAddr, writeJson = true) {
  const { contract: valid, receipt } = await deployContractAndReturnReceipt(
    "MarketValid",
    [factoryAddr]
  );

  const result = {
    MarketValid: valid.address,
    ["MarketValid_block"]: receipt.blockNumber,
  };
  if (writeJson) writeContractAddresses(result);

  return valid;
}

// async function readMarketValidContract(symbol) {
// 	const valid = await readDeployedContract2({ name: "MarketValid", symbol: symbol });
// 	return valid;
// }

async function readMarketValidContract() {
  const valid = await readDeployedContract("MarketValid");
  return valid;
}

async function readMarketValidContractFromMarketID({ marketID }) {
  const valid = await readDeployedContract(
    "MarketValid",
    [],
    "MarketValid" + marketID
  );
  return valid;
}

async function setMarketValidConf(
  minSlippage,
  maxSlippage,
  minLeverage,
  maxLeverage,
  maxTradeAmount,
  minPay,
  minCollateral,
  allowOpen,
  allowClose,
  tokenDigits
) {
  const valid = await readMarketValidContract();
  await handleTx(
    valid.setConf(
      minSlippage,
      maxSlippage,
      minLeverage,
      maxLeverage,
      maxTradeAmount,
      minPay,
      minCollateral,
      allowOpen,
      allowClose,
      tokenDigits
    ),
    "valid.setConf"
  );
}

async function setMarketValidConfData(data) {
  const router = await readMarketRouterContract();
  await handleTx(router.setConfData(data), "router.setConfData");
}

async function readMarketValidContractFromAPI(symbol) {
  const datas = await fetchContractAddresses();
  for (let index = 0; index < datas.length; index++) {
    const element = datas[index];
    if (element.name == "MarketValid") {
      const contractFactory = await ethers.getContractFactory("MarketValid");
      return await contractFactory.attach(element.address);
    }
  }
}

module.exports = {
  deployMarketValid,
  readMarketValidContract,
  setMarketValidConf,
  setMarketValidConfData,
  readMarketValidContractFromAPI,
  readMarketValidContractFromMarketID,
};
