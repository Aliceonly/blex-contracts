const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  handleTx,
  deployContract,
} = require("../utils/helpers");

async function deployMockMarketVaild(writeJson = true) {
  const mv = await deployOrConnect("MockMarketVaild", []);
  const result = {
    MockMarketVaild: mv.address,
  };

  if (writeJson) writeContractAddresses(result);

  return mv;
}

async function readMockMarketVaildContract() {
  const mv = await readDeployedContract("MockMarketVaild");
  return mv;
}

async function setMockMarketValidConf(
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
  const valid = await readDeployedContract("MockMarketVaild");
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

module.exports = {
  deployMockMarketVaild,
  readMockMarketVaildContract,
  setMockMarketValidConf,
};
