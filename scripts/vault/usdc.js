const {
  deployOrConnect,
  readDeployedContract,
  writeContractAddresses,
  fetchContractAddresses,
  handleTx,
} = require("../utils/helpers");

async function deployUSDC(name, symbol, initialSupply, writeJson = true) {
  const vault = await deployOrConnect(
    "USDC",
    [name, symbol, initialSupply],
    "USDT"
  );

  const result = {
    USDT: vault.address,
  };
  if (writeJson) writeContractAddresses(result);

  return vault;
}

async function readUSDCContract() {
  const vault = await readDeployedContract("USDC", [], "USDT");
  return vault;
}

async function batchMint(tos, amount) {
  const vault = await readUSDCContract();
  return await handleTx(vault.batchMint(tos, amount), "USDT.batchMint");
}
async function mint(to, amount) {
  const vault = await readUSDCContract();
  return await handleTx(vault.mint(to, amount), "USDT.mint");
}

async function userApproveUSDT(user, toAddr, amount) {
  const vault = await readUSDCContract();
  await handleTx(
    vault.connect(user).approve(toAddr, amount),
    "USDT.userApprove"
  );
}

async function approve(to, amount) {
  const vault = await readUSDCContract();
  return vault.approve(to, amount);
}

async function balanceOf(account) {
  const vault = await readUSDCContract();
  return vault.balanceOf(account);
}

async function connectApprove(user, to, amount) {
  const vault = await readUSDCContract();

  return await vault.connect(user).approve(to, amount);
}

async function decimals() {
  const vault = await readUSDCContract();

  return await vault.decimals();
}
module.exports = {
  deployUSDC,
  readUSDCContract,
  batchMint,
  approve,
  balanceOf,
  mint,
  userApproveUSDT,
  decimals,
  connectApprove,
};
