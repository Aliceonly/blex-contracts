const { ethers } = require("hardhat");
const { deployServiceAllMarket } = require("../../deploy/deployAllContract");
const { execPrePare } = require("../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildDecreasePositionParam,
} = require("../../utils/buildParams");
const {
  increasePosition,
  decreasePosition,
} = require("../../../../scripts/market/marketRouter");
const {
  vaildFundUsed,
  vaildDeleteOrderEvent,
  validTransfer,
} = require("../../utils/vaildData");
const { setPrice } = require("../../../../scripts/mock/oracle");

describe("increasePosition", async () => {
  let allContracts;
  let owenrUser, secondUser, thirdUser;
  beforeEach(async () => {
    allContracts = await deployServiceAllMarket();

    [owenrUser, secondUser, thirdUser] = await ethers.getSigners();
  });

  it("test case", async () => {

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
    }

    await vaildFundUsed({
      market: allContracts.market.address,
      targetAmount: 90,
    });
  });

  it("test case", async () => {

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
    }
  });

  it("test case", async () => {

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
    await setPrice(allContracts.indexToken, 39000);

    //close a position
    {
      let decParams = buildDecreasePositionParam({
        market: allContracts.market.address,
        price: 39000,
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
        from: allContracts.market.address,
        to: allContracts.lpContracts.vault.address,
        amount: (1000 / 40000) * 90,
      });
    }
  });
});
