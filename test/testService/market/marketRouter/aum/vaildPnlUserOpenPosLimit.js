const { ethers } = require("hardhat");
const {
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
  userMintAndApprove,
} = require("../../../deploy/deployAllContract");
const {
  setIsEnableMarketConvertToOrder,
  increasePosition,
  connectDecreasePosition,
  connectIncreasePosition,
  connectIncreasePositionRevert,
} = require("../../../../../scripts/market/marketRouter");
const { setPrice } = require("../../../../../scripts/mock/oracle");
const {
  getBuildGlobalParams,
  getMaxIncreasePositionSize,
} = require("../../../utils/globalVaild");
const { BigNumber } = require("ethers");
const { buildIncreasePositionParam } = require("../../../utils/buildParams");
const { numberToBigNumber, logger } = require("../../../utils/utils");

describe("AUM Test", async () => {
  let allContracts;
  let owner, second, third;
  beforeEach(async () => {
    allContracts = await readServiceAllMarket();
    [owner, second, third] = await ethers.getSigners();
    await execCancelOrderAndLiqPosition({
      users: [owner, second, third],
      orderBookLong: allContracts.orderBookLong,
      orderBookShort: allContracts.orderBookShort,
      market: allContracts.market.address,
      indexToken: allContracts.indexToken,
    });
  });

  it("The test user first opens half of the total AUM, and the profit is doubled, to see if the user can still open the position, and whether the error is reported if it exceeds Pass", async () => {
    logger.info(
      "---The test user first opens half of the total AUM, and the profit is doubled, to see if the user can still open the position, and whether the error is reported if it exceeds Pass---"
    );
    await setIsEnableMarketConvertToOrder(false);
    await setPrice(allContracts.indexToken, 40000);
    //Calculate the maximum number of positions that can be opened locally
    //Read how many orders the user has opened from the contract
    let globalParams = await getBuildGlobalParams({
      market: allContracts.market.address,
      user: owner.address,
      collateralToken: allContracts.collateralToken,
      isLong: true,
      sizeDelta: 0,
    });
    let limit = await getMaxIncreasePositionSize({
      params: globalParams,
    });

    //Every time you open 10000size, calculate the maximum number of orders you can open, which will exceed the Open Position limit
    let number = limit.div(numberToBigNumber(100000));

    ///Recurring order opening number/2, after the price doubles, the Open Position cannot be opened
    for (
      let index = BigNumber.from(0);
      index.lt(number.div(2));
      index = index.add(1)
    ) {
      await userMintAndApprove(owner, 10000, allContracts.marketRouter);
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 10000,
        size: 100000,
      });

      let lastTx = await connectIncreasePosition(owner, params);
    }

    //Set the oracle price gained profit
    await setPrice(allContracts.indexToken, 80000);

    //should revert
    {
      await userMintAndApprove(owner, 10000, allContracts.marketRouter);
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 80000,
        pay: 10000,
        size: 100000,
      });
      await connectIncreasePositionRevert(owner, params);
    }
  });
});
