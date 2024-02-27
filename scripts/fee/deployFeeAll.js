const { deployFeeVault, readFeeVaultContract } = require("./feeVault.js");
const { deployFundFee, readFundFeeContract } = require("./fundFee.js");
const {
  deployFeeRouter,
  initFeeRouter,
  readFeeRouterContract,
} = require("./feeRouter.js");
const { grantRoleIfNotGranted } = require("../utils/helpers");

async function deployFee(factoryAddr, writeJson = true, isInit = true) {
  const feeVault = await deployFeeVault(writeJson);
  const fundFee = await deployFundFee(feeVault.address, writeJson);
  const feeRouter = await deployFeeRouter(factoryAddr, writeJson);

  if (isInit) {
    await initFeeRouter(feeVault.address, fundFee.address);
    console.log(feeVault.address, fundFee.address);
  }
  await grantRoleIfNotGranted(
    feeVault,
    "ROLE_CONTROLLER",
    fundFee.address,
    "deployFee.feeVault.grant.fundFee"
  );

  await grantRoleIfNotGranted(feeVault, "ROLE_CONTROLLER", feeRouter.address);
  await grantRoleIfNotGranted(fundFee, "ROLE_CONTROLLER", feeRouter.address);

  return {
    feeRouter: feeRouter,
    fundFee: fundFee,
    feeVault: feeVault,
  };
}

async function readAllFee() {
  let feeRouter = await readFeeRouterContract();
  let fundFee = await readFundFeeContract();
  let feeVault = await readFeeVaultContract();

  return {
    feeRouter: feeRouter,
    fundFee: fundFee,
    feeVault: feeVault,
  };
}

module.exports = {
  deployFee,
  readAllFee,
};
