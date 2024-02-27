const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  execCancelOrderAndLiqPosition,
  readServiceAllMarket,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildFees,
  buildDecreasePositionParam,
} = require("../../../utils/buildParams");
const {
  validSize,
  validBalanceChange,
  validTransfer,
  validPnl,
  validCollateral,
  vaildUpdatePositionEvent,
  validAvgPrice,
  checkCollateral,
} = require("../../../utils/vaildData");
const {
  calcOpenFee,
  totalFees,
  calcMarketAmount,
  getCurrentPosition,
  calcPNL,
  calcCollateral,
  calAveragePrice,
  calcCloseFee,
  advanceOneDay,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const { getPrice } = require("../../../../../scripts/mock/oracle");
const { vaildPosition } = require("../../../utils/vaildPosition");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  increasePosition,
  decreasePosition,
  connectIncreasePosition,
} = require("../../../../../scripts/market/marketRouter");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { expect } = require("chai");
const { BigNumber } = require("ethers");

describe("When testing partial lighten-up, whether the fee deduction is correct, and whether the money received by the user is correct", async () => {
  let allContracts;
  let owner, second, third;
  beforeEach(async () => {
    allContracts = await readServiceAllMarket();

    [owner, second, third] = await ethers.getSigners();
    await execCancelOrderAndLiqPosition({
      users: [owner, second, third],
      market: allContracts.market.address,
      orderBookLong: allContracts.orderBookLong,
      orderBookShort: allContracts.orderBookShort,
      indexToken: allContracts.indexToken,
    });
  });
  it("When testing partial lighten-up, whether the fee deduction is correct, and whether the money received by the user is correct", async () => {
    logger.info(
      "---When testing partial lighten-up, whether the fee deduction is correct, and whether the money received by the user is correct---"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 500,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });
    //Build position opening parameters
    let params = buildIncreasePositionParam({
      market: allContracts.market.address,
      price: 40000,
      pay: 500,
      size: 5000,
    });

    //Increase positions for users
    {
      //check  the user's position before executing the trade
      await validSize({
        user: owner.address,
        price: 0,
        isLong: true,
        size: 0,
      });
      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 40000,
        isLong: true,
      });

      //Get opening fee
      let openFee = calcOpenFee({
        sizeDelta: params._sizeDelta,
      });
      //Construct the various fees of this transaction
      let fees = buildFees({
        openFee: openFee,
      });

      //Sum up the various expenses
      let totalFee = totalFees(fees);
      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      //Used to check  the position
      params._oraclePrice = oracelPrice;
      // check  the position
      vaildPosition({
        params: params,
        position: position,
        fees: fees,
      });

      //Get the market balance before the transaction is initiated
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Open Position
      let lastTx = await increasePosition(params);
      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //check
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow size changes"
      );

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
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );
      //Calculate the funds that the market should receive

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      let marketAmount = calcMarketAmount({
        amount: params.collateralDelta,
        fee: totalFee,
      });
      //check  market balance changes
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
      );
      //check  user's position after trade execution
      await validSize({
        user: owner.address,
        price: 40000,
        size: 5000,
      });

      //check feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "The feeRouter balance does not correspond to the expected one",
        expandDecimals: false,
      });

      //check  the user balance transferred to the market amount
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 500,
        label:
          "The amount transferred to the market by the user does not correspond to the expected amount",
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

      //check collateral
      await validCollateral({
        user: owner.address,
        price: 40000,
        isLong: params._isLong,
        coll: calcCollateral({
          pay: params.collateralDelta,
          fees: totalFee,
        }),
      });
      //Check average price
      await validAvgPrice({
        user: owner.address,
        price: 0,
        isLong: true,
        price0: calAveragePrice({
          position: position,
          sizeDelta: params._sizeDelta,
          marketPrice: oracelPrice,
          pnl: 0,
          hasProfit: true,
        }),
      });

      //check  event and corresponding parameters
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });
    }

    //Moving forward beyond the fundingInterval time will allow the next operation to update the funding fee
    //await advanceOneDay();
    {
      await userMintAndApprove(second, 200, allContracts.marketRouter);
      await validSize({
        user: second.address,
        price: 40000,
        isLong: true,
        size: 0,
      });

      let incParams = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 200,
        size: 2000,
      });
      //Get the user's balance before the transaction is executed
      let beforeAmount = await balanceOf(second.address);
      await connectIncreasePosition(second, incParams);

      await validSize({
        user: second.address,
        price: 40000,
        isLong: true,
        size: 2000,
      });
    }

    //Execution of position reduction
    {
      //Calculate Funding Fee
      //Get the  user current position
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

      //check amount

      //Get the user's balance before decrease position
      let beforeAmount = await balanceOf(owner.address);

      //Build decrease position Parameters
      let params = buildDecreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        size: 1000,
        isKeepLev: true,
      });

      //build the list of fees required for this decrease position
      let fees = buildFees({
        closeFee: calcCloseFee({ sizeDelta: params._sizeDelta }),
        fundFee: fundingFee,
      });

      let totalsFee = totalFees(fees);
      let oracelPrice = await getPrice(allContracts.indexToken, true);

      params._oraclePrice = oracelPrice;

      //check position
      vaildPosition({
        params: params,
        position,
        fees,
      });
      //Obtain the collateral for this position reduction
      let collateralDelta = position.collateral.div(5);

      let coll = collateralDelta.gt(totalsFee)
        ? collateralDelta.sub(totalsFee)
        : position.collateral.sub(totalsFee);

      let eventArgs = [
        owner.address, //account //collateral
        collateralDelta,
        collateralDelta, //collDA
        params._sizeDelta, //sizeDelta
        true, //isLong
        oracelPrice, // oraclePrice
        0, //pnl
        fees, // fees []int
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        1, //category
        0, //fromOrder
      ];

      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //increase position
      let lastTx = await decreasePosition(params);

      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //check
      validBalanceChange(
        params._sizeDelta,
        beforeMarketFundsUsed.sub(afterMarketFundsUsed)
      );

      validBalanceChange(
        collateralDelta,
        beforeMarketAmount.sub(afterMarketAmount),
        "check collateral changes"
      );
      //After executing the transaction, check the user's position
      await validSize({
        user: owner.address,
        price: 40000,
        size: 4000,
        isLong: true,
      });

      //check collateral
      await checkCollateral({
        user: owner.address,
        price: 40000,
        isLong: params._isLong,
        coll: calcCollateral({
          pay: position.collateral,
          fees: collateralDelta,
        }),
      });

      //check feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalsFee,
        label: "Balance received by feeRouter",
        expandDecimals: false,
      });

      let amount = params.collateralDelta.sub(totalsFee);
      console.log(amount);

      //emit event;
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });
    }
  });
});
