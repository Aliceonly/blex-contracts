const { vaultPramsRole, getVaultRouterPrams } = require("../prams")
const {
  expandDecimals,
  formatAmount,
} = require("../../../scripts/utils/utilities")
const { expect, use } = require("chai")
const { sendTxn } = require("../../../scripts/utils/helpers")
const { utils } = require("ethers")

async function buyDLP(args, u, amount) {
  const { lp, usdc, vault, router } = args
  await usdc
    .connect(u)
    .approve(router.address, amount.mul(expandDecimals(100, 6)));
  //const allowance = await usdc.allowance(u.address, router.address)
  await router.connect(u).deposit(vault.address, u.address, amount, 0)
  const dlp = await lp.balanceOf(u.address)
  return {
    formatAmount: formatAmount(dlp, 6),
    amount: dlp,
  }
}

describe("VaultRouter buyDLP test", function () {
  let args = {
    lp: undefined,
    vault: undefined,
    router: undefined,
    user: undefined,
    usdc: undefined,
    amount: undefined,
  }
  beforeEach(async () => {
    args = await vaultPramsRole(1000)
  })
  it("initVault should buyDLP 1000usdc=1000dlp", async function () {
    const { lp, usdc, user, vault, router, amount } = args
    await usdc.approve(router.address, amount)
    await router.deposit(vault.address, user.address, amount, 0)
    const dlpAmount = await lp.balanceOf(user.address)
    expect(amount, "initVault buyDLP sharesOut != amount").eq(dlpAmount)
  })

  it("pnl +5000 should buyDLP 1000usdc=166.66666dlp", async function () {
    const { lp, usdc, vault, router, amount, pb, user, user0, user1 } = args

    const userdlp = await buyDLP(args, user, amount)
    expect(amount).eq(userdlp.amount)
    const pnl0 = await getVaultRouterPrams(router, lp)
    console.log("pnl0", pnl0)

    await pb.setPnl(expandDecimals(5000, 6));
    const Pnl5000 = await getVaultRouterPrams(router, lp);
    console.log("Pnl5000", Pnl5000);

    const user0dlp = await buyDLP(args, user0, amount)
    expect(user0dlp.amount).eq(amount.mul(1e8).div(Pnl5000.price))
  })
})

module.exports = {
  buyDLP,
}
