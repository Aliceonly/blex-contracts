const { ethers } = require("hardhat");
const { deployServiceAllMarket } = require("../deploy/deployAllContract");

describe("vaultRouter", async () => {
  let allContracts;
  let ownerUser, secondUser, thirdUser;

  beforeEach(async () => {
    allContracts = await deployServiceAllMarket();
    [ownerUser, secondUser, thirdUser] = await ethers.getSigners();
  });

  it("test case", async () => {
    await setIsEnableMarketConvertToOrder(false);
    //Set the oracle price
    await setPrice(allContracts.indexToken, 40000);

    await userMintAndApprove(owner, 10, allContracts.marketRouter);
    //
    let beforeSize = await getSize({
      user: owner.address,
      price: 40000,
      isLong: true,
    });

    let beforeAmount = await balanceOf(owner.address);
    //Build position opening parameters
    let params = buildIncreasePositionParam({
      market: allContracts.market.address,
      price: 40000,
      pay: 10,
      size: 90,
    });
    //increase position
    await increasePosition(params);

    let afterAmount = await balanceOf(owner.address);
    expect(
      beforeAmount.sub(afterAmount),
      "Open Position user failed to deduct paycheck"
    ).eq(params.collateralDelta);

    let atferSize = await getSize({
      user: owner.address,
      price: 40000,
      isLong: true,
    });
    expect(params._sizeDelta, "test case").eq(
      atferSize.sub(beforeSize)
    );

    await setPrice(allContracts.indexToken, 50000);

    await validPnl({
      user: owner.address,
      price: 50000,
      isLong: true,
      pnl: "22.5",
    });
  });
});
