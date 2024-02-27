const { vaultPramsNotRole } = require("../prams")
const { sendTxn } = require("../../../scripts/utils/helpers");
const { expect, use, assert } = require("chai");


describe("Vault.deploy", function () {
    it("should deploy Vault", async function () {
        const { lp, vault, router } = await vaultPramsNotRole(1000)
        assert.notEqual(lp.address)
        assert.notEqual(vault.address)
        assert.notEqual(router.address)
    })
    it("test case", async function () {
        const { usdc, vault, router, user, amount } = await vaultPramsNotRole(1000)
        await usdc.connect(user).approve(router.address, amount);
        await expect(
            router.deposit(vault.address, user.address, amount, 0)
        ).to.be.revertedWith("AccessControl: account ${router.address} is missing role ${vault.address}")
    })
    it("test case", async function () {
        const { lp, vault, router } = await deploy()
    })
});