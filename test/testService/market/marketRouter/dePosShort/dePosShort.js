const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildDecreasePositionParam,
  buildFees,
} = require("../../../utils/buildParams");
const {
  validSize,
  validTransfer,
  validCollateral,
  vaildUpdatePositionEvent,
  validBalanceChange,
} = require("../../../utils/vaildData");
const {
  increasePosition,
  decreasePosition,
} = require("../../../../../scripts/market/marketRouter");
const { setPrice, getPrice } = require("../../../../../scripts/mock/oracle");
const {
  getCurrentPosition,
  calcCollateral,
  calcOpenFee,
  totalFees,
  calcCloseFee,
  calcPNL,
  getSize,
  getCollateral,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const { vaildPosition } = require("../../../utils/vaildPosition");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { BigNumber } = require("ethers");

describe("Test the market price Open Position - short profit close a position", async () => {
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

  it("test case", async () => {
    logger.info(
      "test case"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });
    //Build and increase position parameters
    let incParams = buildIncreasePositionParam({
      market: allContracts.market.address,
      price: 40000,
      pay: 10,
      size: 90,
      isLong: false,
    });
    //Used to hold collateral  balances
    let afterCollD;

    //increase position
    {
      //Get user positions for data verification before trading
      let position = await getCurrentPosition({
        user: owner.address,
        price: 40000,
        isLong: incParams._isLong,
      });
      //Calculate Funding Fee
      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        incParams._isLong
      );
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });
      //Construct the fee list required for this transaction
      let fees = buildFees({
        openFee: calcOpenFee({
          sizeDelta: incParams._sizeDelta,
        }),
        fundFee: fundingFee,
      });
      //Accumulate the fees
      let totalFee = totalFees(fees);

      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);

      incParams._oraclePrice = oracelPrice;

      //Data verification before transaction execution
      vaildPosition({
        params: incParams,
        position,
        fees,
      });
      let collD = incParams.collateralDelta.sub(totalFee);
      //Build event parameter list
      let eventArgs = [
        owner.address,
        incParams.collateralDelta,
        collD,
        incParams._sizeDelta,
        false,
        oracelPrice,
        0,
        fees,
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        0, //category
        0, //fromOrder
      ];

      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Access to market funding before trades are initiated
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get user balance before transaction is initiated
      let beforeAmount = await balanceOf(owner.address);

      //Get the user's position before the transaction for later verification of the position
      let beforeSize = await getSize({
        user: owner.address,
        price: 40000,
        isLong: false,
      });

      //increase position
      let lastTx = await increasePosition(incParams);

      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Get user balance after transaction is completed
      let afterAmount = await balanceOf(owner.address);

      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();

      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM valuechange"
      );

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //After the transaction is executed, the user's position is obtained and verified
      let afterSize = await getSize({
        user: owner.address,
        price: 40000,
        isLong: false,
      });

      //Calculate the position collateral
      let coll = calcCollateral({
        pay: incParams.collateralDelta,
        fees: totalFee,
      });
      afterCollD = coll;
      //Get a deposit for now
      let afterColl = await getCollateral({
        user: owner.address,
        price: 40000,
        isLong: false,
      });

      //check  user collateral  changes
      validBalanceChange(
        coll,
        afterColl.sub(position.collateral),
        "check  user collateral  changes"
      );

      //Check whether the borrow size corresponds
      validBalanceChange(
        incParams._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow Size"
      );

      //check  user position changes
      validBalanceChange(
        incParams._sizeDelta,
        afterSize.sub(beforeSize),
        "check user size"
      );

      //check  user balance changes
      validBalanceChange(
        incParams.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user bal"
      );

      //check  market balance changes
      validBalanceChange(
        coll,
        afterMarketAmount.sub(beforeMarketAmount),
        "check market bal"
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

      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });

      //check  the balance change after the transaction execution is completed
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 10,
        label: "check User transfers funds into the market",
      });
    }

    await setPrice(allContracts.indexToken, 40000 - 100);

    //close a position
    {

      let size = await getSize({
        user: owner.address,
        price: 40000 - 100,
        isLong: false,
      });
      //Build decrease position Parameters
      let decParams = buildDecreasePositionParam({
        market: allContracts.market.address,
        price: 40000 - 100,
        isLong: false,
      });

      let oraclePrice = await getPrice(allContracts.indexToken, true);
      decParams._sizeDelta = size;
      decParams._oraclePrice = oraclePrice;

      //Get the  user current position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 40000 - 100,
        isLong: decParams._isLong,
      });

      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        false
      );

      //Local calculation of funding rate
      let fundingFee = getFundingFee({
        size: position.size,
        entryFundingRate: position.entryFundingRate,
        cumRates: cumRates,
      });

      //build the list of fees required for this transaction
      let fees = buildFees({
        closeFee: calcCloseFee({
          sizeDelta: decParams._sizeDelta,
        }),
        fundFee: fundingFee,
      });
      //add up the fees
      let totalFee = totalFees(fees);
      //Check positions (margin, leverage, slippage, etc.)
      vaildPosition({
        params: decParams,
        position,
        fees: fees,
      });

      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Get market balances before trading
      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //close a position
      let lastTx = await decreasePosition(decParams);
      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      //Get market balance after trade execution
      let afterMarketAmount = await balanceOf(allContracts.market.address);
      let afterAum = await getAUM();
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM valuechange"
      );

      //checkvault borrow size
      validBalanceChange(
        decParams._sizeDelta,
        beforeMarketFundsUsed.sub(afterMarketFundsUsed),
        "checkvault borrow size"
      );

      //check market bal change
      validBalanceChange(
        afterCollD,
        beforeMarketAmount.sub(afterMarketAmount),
        "check market bal change"
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
      //Calculate the current user profit
      let result = calcPNL({
        position,
        price: 40000 - 100,
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
        label: "check  the user balance transferred to the market amount",
        expandDecimals: false,
      });

      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.lpContracts.vault.address,
        to: allContracts.market.address,
        amount: pnl,
        label: "check vault bal change",
        expandDecimals: false,
      });

      //Build close a position emit event parameter list
      let eventArg = [
        owner.address, //account
        afterCollD, //collateralDelta
        afterCollD, //collateralDeltaAfter
        decParams._sizeDelta, //_sizeDelta
        false, //_isLong
        oraclePrice, //_oraclePrice
        pnl, //realisedPnl
        fees, //fees
        allContracts.market.address, //_market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, //indexToken
        1, //category
        0, //_fromOrder
      ];

      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArg,
      });
    }
  });
});
