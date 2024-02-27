const { ethers } = require("hardhat");
const { deployServiceAllMarket } = require("../../deploy/deployAllContract");

describe("vault increasePosition", async () => {
  let allContracts;
  let owenrUser, secondUser, thirdUser;
  beforeEach(async () => {
    allContracts = await deployServiceAllMarket();
    [owenrUser, secondUser, thirdUser] = await ethers.getSigners();
  });

  it("gained profitCheck event", async () => {

    await execPrePare({
      user: owenrUser,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });

    //increase position
    {
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 10,
        size: 90,
      });
      //Open Position
      await increasePosition(params);

      await vaildFundUsed({
        market: allContracts.market.address,
        targetAmount: 90,
      });
    }

    //Set the oracle price
    await setPrice(allContracts.indexToken, 50000);

    //close a position
    {
      let decParams = buildDecreasePositionParam({
        market: allContracts.market.address,
        price: 50000,
        size: 90,
      });
      let lastTx = await decreasePosition(decParams);


      await vaildFundUsed({
        market: allContracts.market.address,
        targetAmount: 0,
      });


      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.lpContracts.vault.address,
        to: allContracts.market.address,
        amount: (10000 / 40000) * 90,
      });
      //checkevent
    }
  });

  it("test case", async () => { });
});
