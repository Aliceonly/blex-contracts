const { ethers } = require("hardhat");
const {
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
  userMintAndApprove,
} = require("../../../deploy/deployAllContract");
const {
  setIsEnableMarketConvertToOrder,
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
const { getAUM } = require("../../../../../scripts/vault/vaultRouter");

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

  it("Test the maximum number of positions the user can open on the basis of losses, and whether an error is reported if the excess is passed", async () => {
    logger.info(
      "---Test the maximum number of positions the user can open on the basis of losses, and whether an error is reported if the excess is passed---"
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
    let number;
    //Every time you open 10000size, calculate the maximum number of orders you can open, which will exceed the Open Position limit
    let flage = limit.mod(numberToBigNumber(100000)) == 0;
    if (flage == true) {
      number = limit.div(numberToBigNumber(100000)).sub(1);
    } else {
      number = limit.div(numberToBigNumber(100000));
    }

    ///Recurring order opening number/2, after the price doubles, the Open Position cannot be opened
    for (
      let index = BigNumber.from(0);
      index.lt(number);
      index = index.add(1)
    ) {
      console.log("index", index);
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

    //Set the oracle price realized loss of ten percent
    await setPrice(allContracts.indexToken, 36000);
    //11000233382023376623376619
    //10000000000000000000000000
    let globalParam = await getBuildGlobalParams({
      market: allContracts.market.address,
      user: owner.address,
      collateralToken: allContracts.collateralToken,
      isLong: true,
      sizeDelta: 0,
    });

    limit = await getMaxIncreasePositionSize({
      params: globalParam,
    });
    let aum = await getAUM();
    console.log(globalParam);
    console.log(limit, aum);

    // for (
    //   let index = BigNumber.from(0);
    //   index.lt(number.div(10));
    //   index = index.add(1)
    // ) {
    //   console.log("index", index, number.div(10), numberToBigNumber(100000));
    //   await userMintAndApprove(owner, 10000, allContracts.marketRouter);
    //   //Build position opening parameters
    //   let params = buildIncreasePositionParam({
    //     market: allContracts.market.address,
    //     price: 36000,
    //     pay: 10000,
    //     size: 100000,
    //   });

    //   let lastTx = await connectIncreasePosition(owner, params);
    // }

    // {
    //   await userMintAndApprove(owner, 10000, allContracts.marketRouter);
    //   //Build position opening parameters
    //   let params = buildIncreasePositionParam({
    //     market: allContracts.market.address,
    //     price: 36000,
    //     pay: 10000,
    //     size: 100000,
    //   });
    //   await connectIncreasePositionRevert(owner, params);
    // }
  });
});
