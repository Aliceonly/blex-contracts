const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildFees,
  buildIncreaseOrderParam,
  buildDecreaseOrderParam,
  buildDecreasePositionParam,
} = require("../../../utils/buildParams");
const {
  validSize,
  validBalanceChange,
  validTransfer,
  validPnl,
  validCollateral,
  validAvgPrice,
  vaildUpdatePositionEvent,
  vaildOrderExist,
} = require("../../../utils/vaildData");
const {
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  calcMarketAmount,
  calcPNL,
  calcCollateral,
  calAveragePrice,
  priceToBigNumber,
  numberToBigNumber,
  calcCloseFee,
  calcSlippagePrice,
  getOrderInfo,
  advanceOneDay,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
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
  connectUpdateOrder,
  decreasePosition,
  connectIncreasePosition,
} = require("../../../../../scripts/market/marketRouter");
const {
  vaildIncreaseOrder,
  vaildOrderCreated,
  vaildUpdateOrderEvent,
  vaildDeleteOrderEvent,
} = require("../../../utils/vaildOrder");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { BigNumber } = require("ethers");

describe("close position", async () => {
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

  it("When testing close a position, whether the fund fee deduction is correct", async () => {
    logger.info(
      "---When testing close a position, whether the fund fee deduction is correct---"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 500,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });
    //Build and increase position parameters
    let incParams = buildIncreasePositionParam({
      market: allContracts.market.address,
      price: 40000,
      pay: 500,
      size: 5000,
    });
    //Used to hold collateral  balances
    let afterCollD;

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
        sizeDelta: incParams._sizeDelta,
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
      incParams._oraclePrice = oracelPrice;
      // check  the position
      vaildPosition({
        params: incParams,
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
      let lastTx = await increasePosition(incParams);
      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //check  user
      validBalanceChange(
        incParams._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow Size"
      );

      //Calculate the collD required for the emit event
      let collD = incParams.collateralDelta.sub(totalFee);

      //Build event parameter list
      let eventArgs = [
        owner.address, //account
        incParams.collateralDelta, //collateralDelta
        collD, //collD
        incParams._sizeDelta, //size
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
      let marketAmount = calcMarketAmount({
        amount: incParams.collateralDelta,
        fee: totalFee,
      });

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

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
        label: "check feeRouter balance",
        expandDecimals: false,
      });

      //check  the user balance transferred to the market amount
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 500,
        label: "Check user transfers to the market amount",
      });

      //get position
      position = await getCurrentPosition({
        user: owner.address,
        price: 40000,
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

      let coll = calcCollateral({
        pay: incParams.collateralDelta,
        fees: totalFee,
      });
      afterCollD = coll;
      //check collateral
      await validCollateral({
        user: owner.address,
        price: 40000,
        isLong: incParams._isLong,
        coll,
      });

      //Check average price
      await validAvgPrice({
        user: owner.address,
        price: 40000,
        isLong: true,
        price0: calAveragePrice({
          position: position,
          sizeDelta: incParams._sizeDelta,
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
    //Increase the position for the second user to update the fund fee
    {
      await advanceOneDay();
      await advanceOneDay();
      //Give second usermint 500 tokens and authorize marketRouter
      await userMintAndApprove(second, 500, allContracts.marketRouter);
      //Build and increase position parameters
      let incParams = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 500,
        size: 5000,
      });
      await connectIncreasePosition(second, incParams);
      //Used to update the funding rate, push forward at least the fundingInterval interval
    }

    //Close all positions
    {
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

      let decParams = buildDecreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        size: 5000,
      });
      let collateralDelta = position.collateral;
      let fees = buildFees({
        closeFee: calcCloseFee({ sizeDelta: decParams._sizeDelta }),
        fundFee: fundingFee,
      });
      let totalFee = totalFees(fees);

      let oraclePrice = await getPrice(allContracts.indexToken, false);

      //Build event parameters
      let eventArg = [
        owner.address,
        collateralDelta,
        collateralDelta,
        decParams._sizeDelta,
        true,
        oraclePrice,
        0,
        fees,
        allContracts.market.address,
        allContracts.collateralToken,
        allContracts.indexToken,
        1,
        0,
      ];

      let lastTx = await decreasePosition(decParams);
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

      //Calculate the current user profit
      let result = calcPNL({
        position,
        price: 40000,
      });
      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);
      //Calculate the current user profit
      let collD = afterCollD.sub(totalFee);

      //Calculate the funds the user should receive
      let receiveAmount = collD.add(pnl);

      //check  the user balance transferred to the market amount
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: owner.address,
        amount: receiveAmount,
        label:
          "close a position  After the user's profit and loss  does not correspond to expectations",
        expandDecimals: false,
      });
      //check event parameter
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArg,
      });
    }
  });
});
