const { vaultPramsRole, getVaultRouterPrams } = require("../prams")
const {
  expandDecimals,
  formatAmount,
} = require("../../../scripts/utils/utilities")
const { expect } = require("chai")
const { buyDLP } = require("./buyDLP")
const { ethers } = require("ethers")

async function sellDLP(args, u, amount) {
  const { lp, usdc, vault, router } = args
  await usdc
    .connect(u)
    .approve(router.address, amount.mul(expandDecimals(100, 6)))
  await router.connect(u).redeem(vault.address, u.address, amount, 0)
  const dlp = await lp.balanceOf(u.address)
  return {
    formatAmount: formatAmount(dlp, 6),
    amount: dlp,
  }
}

describe("VaultRouter sellDLP test", function () {
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
  it("initVault sellDLP should redeem more than max ", async function () {
    const { usdc, user, vault, router, amount } = args
    await usdc.connect(user).approve(router.address, amount)
    await expect(
      router.redeem(vault.address, user.address, amount, 0)
    ).to.be.revertedWith("ERC4626: redeem more than max")
  })
  it("initVault sellDLP should 100dlp=99usdc", async function () {
    const { lp, usdc, user, vault, router, amount } = args
    const buyDlpAmount = await buyDLP(args, user, amount)
    expect(buyDlpAmount.amount).eq(amount)

    const dlpSellAmount = expandDecimals(100, 6)
    const fees = dlpSellAmount / 10
    const sellDlpAmount = await sellDLP(args, user, dlpSellAmount)

    expect(sellDlpAmount.amount).eq(amount.sub(dlpSellAmount).sub(fees))
  })
  it("pnl +5000 should sellDLP 10dlp=60usdc", async function () {
    const { lp, usdc, vault, router, amount, pb, user, user0, user1 } = args

    const userdlp = await buyDLP(args, user, amount)
    expect(amount).eq(userdlp.amount)

    await pb.setPnl(expandDecimals(5000, 6))
    const Pnl5000 = await getVaultRouterPrams(router, lp)

    const sellAmount = expandDecimals(10, 6)
    const sellPrice = expandDecimals(Number(Pnl5000.formatPrice), 6)
    const value = sellAmount.mul(sellPrice).div(expandDecimals(1, 6))
    const user0dlp = await sellDLP(args, user, sellAmount)
    expect(user0dlp.amount).eq(amount.sub(value))
  })
})
module.exports = {
  sellDLP,
}
