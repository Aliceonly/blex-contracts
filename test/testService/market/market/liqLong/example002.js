const { ethers } = require("hardhat");
const {
  readServiceAllMarket,
  userMintAndApprove,
  deployServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildFees,
  buildDecreaseOrderParam,
  buildIncreaseOrderParam,
} = require("../../../utils/buildParams");
const {
  validSize,
  validBalanceChange,
  validTransfer,
  vaildUpdatePositionEvent,
  vaildOrderExist,
  validCollateral,
  validPnl,
  validAvgPrice,
} = require("../../../utils/vaildData");
const {
  getSize,
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  calcCollateral,
  getCollateral,
  calcCloseFee,
  numberToBigNumber,
  getOrderInfo,
  calcPNL,
  priceToBigNumber,
  calcSlippagePrice,
  calAveragePrice,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
const {
  vaildPosition,
  getDecreaseDeltaCollateral,
  vaildDecreaseOrder,
} = require("../../../utils/vaildPosition");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  increasePosition,
  connectUpdateOrder,
  updateOrder,
} = require("../../../../../scripts/market/marketRouter");
const {
  ordersIndex,
  getAccountOrderNumber,
} = require("../../../../../scripts/order/orderStore");
const {
  vaildUpdateOrderEvent,
  vaildIncreaseOrder,
  vaildOrderCreated,
  vaildDeleteOrderEvent,
} = require("../../../utils/vaildOrder");
const { expect } = require("chai");
const {
  checkIndexAutoOrderMock,
  performIndexAutoOrderMock,
} = require("../../../../../scripts/am/autoOrderMock");
const { BigNumber } = require("ethers");
const {
  checkIndexAutoLiqMock,
  performIndexAutoLiqMock,
} = require("../../../../../scripts/am/autoLiqMock");

describe("auto", async () => {
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

  it("Test Autoliquidation - Autoliquidation counter check", async () => {
    logger.info("---Test Autoliquidation - Autoliquidation counter check---");
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });

    //Used to hold collateral  balances
    let afterCollD;
    //increase position
    {
      //Build and increase position parameters
      let incParams = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 10,
        size: 90,
      });

      //Get user positions for data verification before trading
      let position = await getCurrentPosition({
        user: owner.address,
        price: 40000,
        isLong: incParams._isLong,
      });

      //Get the sum of funding rates at the current time
      let cumRates = await getCumulativeFundingRates(
        allContracts.market.address,
        incParams._isLong
      );
      //Calculate Funding Fee
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
        true,
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
        isLong: true,
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
        "Check AUM value change"
      );

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

      //After the transaction is executed, the user's position is obtained and verified
      let afterSize = await getSize({
        user: owner.address,
        price: 40000,
        isLong: true,
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
        isLong: true,
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
        "check  user position changes"
      );

      //check  user balance changes
      validBalanceChange(
        incParams.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check  user balance changes"
      );

      //check  market balance changes
      validBalanceChange(
        coll,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
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
    let beforeAum = await getAUM();
    let beforeUSD = await getUSDBalance();
    let beforePNL = await getGlobalPnl();

    let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

    //Set the oracle price
    await setPrice(allContracts.indexToken, 10000);

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
    //execute order
    {
      let execLiq = await checkIndexAutoLiqMock(
        0,
        100,
        allContracts.market.address,
        true
      );

      expect(
        execLiq.length,
        "Positions that have not been queried for clearing standards"
      ).to.eq(1);
    }
  });
});
