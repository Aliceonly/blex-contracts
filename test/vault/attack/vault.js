const { use, expect } = require("chai")
const { solidity } = require("ethereum-waffle");
const { MarketCls } = require("../../market/marketCls")
use(solidity)

describe("test case", function () {
    let marketCls
    beforeEach(async () => {
        marketCls = new MarketCls({ isLong: true })
        await marketCls.initialize()
        await marketCls.initAutoOpen()
        await marketCls.initAutoClose()
    })

    it("test case", async function () {
        expect(await marketCls.vaultRouter.withdraw(
            await marketCls.vault.address,
            marketCls.getUser(1),
            100,
            100
        )).to.be.reverted

        expect(await marketCls.vaultRouter.withdrawToDeposit(
            await marketCls.vault.address,
            // fake vault
            marketCls.getUser(1),
            100, // to
            100, // amount
            //maxSharesIn
            //minSharesOut
        )).to.be.reverted
    });

})
