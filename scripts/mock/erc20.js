const {
  readDeployedContract,
  handleTx,
  deployOrConnect,
} = require("../utils/helpers");

async function deployToken(name, symbol, label, writeJson) {
  const token = await deployOrConnect("ERC20Mocker", [name, symbol], label);

  const result = {
    ERC20Mocker: token.address,
  };
  if (writeJson) writeContractAddresses(result);
  return token;
}

async function readTokenContract() {
  console.log("start");
  const token = await readDeployedContract("ERC20Mocker");
  console.log(token.address);

  return token;
}

async function mint(toAddr, amount) {
  const token = await readTokenContract();
  await handleTx(token.mint(toAddr, amount), "mint");
}

async function connectMint(user, toAddr, amount) {
  const token = await readTokenContract();

  await token.connect(user).mint(toAddr, amount);
}

async function burn(toAddr, amount) {
  const token = await readDeployedContract();
  await handleTx(token.burn(toAddr, amount), "token.burn");
}
async function approve(toAddr, amount) {
  const token = await readTokenContract();
  return await token.approve(toAddr, amount);
}
async function userApprove(user, toAddr, amount) {
  const token = await readTokenContract();
  await handleTx(token.connect(user).approve(toAddr, amount), "userApprove");
}

async function balanceOf(account) {
  const token = await readTokenContract();
  return token.balanceOf(account);
}

async function approve(spender, amount) {
  const token = await readTokenContract();
  await handleTx(token.approve(spender, amount), "token.approve");
}

async function decimals() {
  const token = await readTokenContract();
  return await token.decimals();
}

module.exports = {
  deployToken,
  readTokenContract,
  mint,
  burn,
  approve,
  balanceOf,
  userApprove,
  decimals,
  connectMint,
};
