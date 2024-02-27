const { ethers } = require("hardhat");
const {
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
  userMintAndApprove,
} = require("../../../deploy/deployAllContract");
const {
  getMaxUserNetSizeLimit,
} = require("../../../../../scripts/market/globalValid");
const {
  getMaxUseableUserNetSize,
  validateIncreasePosition,
  getMaxIncreasePositionSize,
  getBuildGlobalParams,
} = require("../../../utils/globalVaild");
const {
  getGlobalSize,
  getAccountSize,
  setIsEnableMarketConvertToOrder,
  increasePosition,
  connectIncreasePositionRevert,
} = require("../../../../../scripts/market/marketRouter");
const {
  getAUM,
  getUSDBalance,
  getGlobalPnl,
  getMarketFundsUsed,
} = require("../../../../../scripts/vault/vaultRouter");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildFees,
  buildGlobalVaildParams,
} = require("../../../utils/buildParams");
const { setPrice, getPrice } = require("../../../../../scripts/mock/oracle");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const {
  numberToBigNumber,
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  calcAUM,
  calAveragePrice,
  calcCollateral,
  calcPNL,
  calcMarketAmount,
  logger,
} = require("../../../utils/utils");
const { vaildPosition } = require("../../../utils/vaildPosition");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  vaildUpdatePositionEvent,
  validAvgPrice,
  validCollateral,
  validPnl,
  validTransfer,
  validBalanceChange,
  validSize,
} = require("../../../utils/vaildData");
const {
  getMarketSizes,
} = require("../../../../../scripts/position/positionBook");

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

  it("Test the maximum number of positions the user can open without any profit or loss, and whether an error is reported if the limit is exceeded Pass", async () => {
    logger.info(
      "---Test the maximum number of positions the user can open without any profit or loss, and whether an error is reported if the limit is exceeded Pass---"
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
    let number;
    //Every time you open 10000size, calculate the maximum number of orders you can open, which will exceed the Open Position limit
    let flage = limit.mod(numberToBigNumber(100000)) == 0;
    if (flage == true) {
      number = limit.div(numberToBigNumber(100000)).sub(1);
    } else {
      number = limit.div(numberToBigNumber(100000));
    }

    //Let the user cycle Open Position
    for (
      let index = BigNumber.from(0);
      index.lt(number);
      index = index.add(1)
    ) {
      await userMintAndApprove(owner, 1000, allContracts.marketRouter);
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 1000,
        size: 100000,
      });
      //Get user position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 40000,
        isLong: true,
      });

      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        true
      );
      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });
      //Get opening fee
      let openFee = calcOpenFee({
        sizeDelta: params._sizeDelta,
      });
      //Construct the various fees of this transaction
      let fees = buildFees({
        openFee: openFee,
        fundFee: fundingFee,
      });
      //Sum up the various expenses
      let totalFee = totalFees(fees);
      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      //Used to check  the position
      params._oraclePrice = oracelPrice;
      //Local calculation Check whether the Open Position limit is reached
      await validateIncreasePosition({
        _inputs: params,
        user: owner.address,
        collateralToken: allContracts.collateralToken,
      });
      //check  collateral, leverage, etc.
      vaildPosition({
        params: params,
        position: position,
        fees: fees,
      });

      //Get the market balance before the transaction is initiated
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      //Get AUM for subsequent data verification
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();
      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      //Get the user's balance before the transaction
      let beforeAmount = await balanceOf(owner.address);

      console.log(
        "beforeAum",
        beforeAum,
        params._sizeDelta,
        beforeMarketFundsUsed
      );

      let lastTx = await increasePosition(params);

      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      let afterAmount = await balanceOf(owner.address);

      //Calculate the collD required for the emit event
      let collD = params.collateralDelta.sub(totalFee);

      //Build event parameter list
      let eventArgs = [
        owner.address, //account
        params.collateralDelta, //collateralDelta
        collD, //collD
        params._sizeDelta, //size
        true, //isLong
        oracelPrice, //oraclePrice
        0, //pnl
        fees, //fees []int
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        0, //category Open Position is 0, increase collateral  is 2
        0, //fromOrder
      ];
      //Get the market balance after the transaction is completed
      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterPNL = await getGlobalPnl();
      let afterUSD = await getUSDBalance();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );
      //Only Open Position AUM will not change anything
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //Calculate the funds that the market should receive
      let marketAmount = calcMarketAmount({
        amount: params.collateralDelta,
        fee: totalFee,
      });
      //Check borrow Size
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check market borrow size"
      );
      //check  market balance changes
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
      );
      //check  user balance changes
      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user balance changes"
      );

      //check feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "check  the amount transferred from market to feeVault",
        expandDecimals: false,
      });

      //check  the user balance transferred to the market amount
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 1000,
        label: "check  the amount transferred by the user to the market",
      });

      //Calculate the total collateral after increasing the position
      let totalCollateral = position.collateral.add(params.collateralDelta);

      //check collateral
      await validCollateral({
        user: owner.address,
        price: 40000,
        isLong: params._isLong,
        coll: calcCollateral({
          pay: totalCollateral,
          fees: totalFee,
        }),
      });

      //get position
      position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });

      //Check PNL, because it is the first time to add a position, so PNL should be 0
      //Calculate PNL locally,,
      let result = calcPNL({
        position,
        price: 40000,
      });
      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      await validPnl({
        user: owner.address,
        price: 40000,
        isLong: true,
        pnl: pnl,
      });
      //get position
      position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });

      //check  event and corresponding parameters
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });
    }

    //if  Open Position  again should revert
    {
      console.log("start");
      await userMintAndApprove(owner, 1000, allContracts.marketRouter);
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 1000,
        size: 100000,
      });

      await connectIncreasePositionRevert(owner, params);
    }
  }).timeout(400000000);
});
