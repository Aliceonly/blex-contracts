const { deployCoreVault } = require("../../scripts/vault/coreVault")
const { deployLPToken } = require("../../scripts/vault/lpToken")
const { deployVaultRouter } = require("../../scripts/vault/vaultRouter")
const { deployPositionBook } = require("../../scripts/mock/positionBook");
const { deployToken } = require("../../scripts/mock/erc20");
const { deployVaultAll, deployVaultRouterRole } = require("../../scripts/vault/deployVaultAll");
const { expandDecimals, formatAmount } = require("../../scripts/utils/utilities");
const { deployContract } = require("../../scripts/utils/helpers");

async function getcommon(num) {
  const amount = expandDecimals(num, 18)
  //const usdc = await deployToken("USDC", "USDC", "USDC");
  const usdc = await deployContract("USDC", ["USDC", "USDC", amount]);
  const pb = await deployPositionBook();
  const [user, user0, user1] = await ethers.getSigners();
  await usdc.mint(user.address, amount.mul(10));
  await usdc.mint(user0.address, amount.mul(10));
  await usdc.mint(user1.address, amount.mul(10));
  return {
    usdc: usdc,
    amount: amount,
    user: user,
    pb: pb,
    user0: user0,
    user1: user1,
  }
}
async function vaultPramsNotRole(num) {
  const { usdc, amount, user, pb, user0, user1 } = await getcommon(num)
  const lp = await deployLPToken()
  const vault = await deployCoreVault("xDLP", usdc.address, lp.address)
  const router = await deployVaultRouter(lp.address, pb.address, vault.address)
  return {
    usdc: usdc,
    lp: lp,
    vault: vault,
    router: router,
    amount: amount,
    user: user,
    pb: pb,
    user0: user0,
    user1: user1,
  }
}
async function vaultPramsRole(num, fn) {
  const { usdc, amount, user, pb, user0, user1 } = await getcommon(num)
  const { LPToken, Vault } = await deployVaultAll(usdc.address)
  let router
  if (fn) {
    pd = fn(Vault)
  }
  router = await deployVaultRouterRole(Vault, LPToken, pb.address)
  return {
    usdc: usdc,
    lp: LPToken,
    vault: Vault,
    router: router,
    amount: amount,
    user: user,
    pb: pb,
    user0: user0,
    user1: user1,
  }
}

async function getVaultRouterPrams(router, lp) {
  const aum = await router.getAUM()
  const price = await router.getLPPrice()
  const asset = await router.getUSDBalance()
  const supply = await lp.totalSupply();
  return {
    formatAum: formatAmount(aum, 18),
    formatPrice: formatAmount(price, 8),
    formatAsset: formatAmount(asset, 18),
    formatSupply: formatAmount(supply, 18),
    aum: aum,
    price: price,
    asset: asset,
    supply: supply
  }
}
async function buyDLP(args, u, amount) {
  const { lp, usdc, vault, router } = args;
  await usdc
    .connect(u)
    .approve(router.address, amount.mul(expandDecimals(100, 18)));
  //const allowance = await usdc.allowance(u.address, router.address)
  await router.connect(u).deposit(vault.address, u.address, amount, 0);
  const dlp = await lp.balanceOf(u.address);
  return {
    formatAmount: formatAmount(dlp, 18),
    amount: dlp,
  };
}
async function sellDLP(args, u, amount) {
  const { lp, usdc, vault, router } = args;
  await usdc
    .connect(u)
    .approve(router.address, amount.mul(expandDecimals(100, 18)));
  await router.connect(u).redeem(vault.address, u.address, amount, 0);
  const dlp = await lp.balanceOf(u.address);
  return {
    formatAmount: formatAmount(dlp, 18),
    amount: dlp,
  };
}
module.exports = {
  vaultPramsNotRole: vaultPramsNotRole,
  vaultPramsRole: vaultPramsRole,
  getVaultRouterPrams: getVaultRouterPrams,
  buyDLP: buyDLP,
  sellDLP: sellDLP
};
