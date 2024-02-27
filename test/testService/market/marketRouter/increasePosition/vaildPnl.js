const {
  increasePosition,
} = require("../../../../../scripts/market/marketRouter");

const { setPrice, getPrice } = require("../../../../../scripts/mock/oracle");
const {
  deployServiceAllMarket,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { expect } = require("chai");

const {
  getCurrentPosition,
  totalFees,
  calcPNL,
  calcOpenFee,
  calcMarketAmount,
  calcCollateral,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  buildIncreasePositionParam,
  buildFees,
} = require("../../../utils/buildParams");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  validPnl,
  validTransfer,
  validSize,
  vaildUpdatePositionEvent,
  vaildOrderExist,
  validBalanceChange,
  validAvgPrice,
  validCollateral,
} = require("../../../utils/vaildData");
const { execPrePare } = require("../../../utils/buildLogic");
const { vaildPosition } = require("../../../utils/vaildPosition");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const { ethers } = require("hardhat");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const { BigNumber } = require("ethers");

describe("Test cases for increasing positions and checking effective profit and loss calculations at different market prices", async () => {
  let allContracts;
  let owner, second, third;
  beforeEach(async () => {
    [owner, second, third] = await ethers.getSigners();
    allContracts = await readServiceAllMarket();
    await execCancelOrderAndLiqPosition({
      users: [owner, second, third],
      market: allContracts.market.address,
      orderBookLong: allContracts.orderBookLong,
      orderBookShort: allContracts.orderBookShort,
      indexToken: allContracts.indexToken,
    });
  });

  it("Test cases for increasing positions and checking effective profit and loss calculations at different market prices", async () => {
    logger.info(
      "---Test cases for increasing positions and checking effective profit and loss calculations at different market prices---"
    );
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 10,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });
    //Open Position
    {
      await validSize({
        user: owner.address,
        price: 0,
        isLong: true,
        size: 0,
      });

      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 10,
        size: 90,
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
      //Add up various expenses
      let totalFee = totalFees(fees);
      let collD = params.collateralDelta.sub(totalFee);

      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);

      params._oraclePrice = oracelPrice;

      vaildPosition({
        params: params,
        position: position,
        fees: totalFee,
      });

      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
      //Get the user's balance before initiating a transaction
      let beforeAmount = await balanceOf(owner.address);

      ////increase position
      let lastTx = await increasePosition(params);
      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );
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

      let marketAmount = calcMarketAmount({
        amount: params.collateralDelta,
        fee: totalFee,
      });

      validBalanceChange(
        params.collateralDelta,
        beforeAmount.sub(afterAmount),
        "check collateral changes"
      );

      //
      validBalanceChange(
        marketAmount,
        afterMarketAmount.sub(beforeMarketAmount),
        "check  market balance changes"
      );
      //check
      validBalanceChange(
        params._sizeDelta,
        afterMarketFundsUsed.sub(beforeMarketFundsUsed),
        "Check borrow size changes"
      );

      //After executing the transaction, check the user's position
      await validSize({
        user: owner.address,
        price: 40000,
        size: 90,
        isLong: true,
      });

      //build eventArgs
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
        0, //category
        0, //fromOrder
      ];

      await setPrice(allContracts.indexToken, 50000);

      position = await getCurrentPosition({
        user: owner.address,
        price: 50000,
        isLong: true,
      });

      let result = calcPNL({
        position: position,
        price: 50000,
      });

      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);
      console.log(pnl);

      await validPnl({
        user: owner.address,
        price: 50000,
        isLong: true,
        pnl: pnl,
      });

      //emit event
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });

      //checkfeeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "check  the amount transferred from market to feeVault",
        expandDecimals: false,
      });

      //check user balance changes
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: owner.address,
        to: allContracts.market.address,
        amount: 10,
        label: "check  the amount transferred by the user to the market",
      });

      await validAvgPrice({
        user: owner.address,
        price: 50000,
        isLong: true,
        price0: 40000,
      });

      await validCollateral({
        user: owner.address,
        price: 50000,
        isLong: true,
        coll: calcCollateral({
          pay: params.collateralDelta,
          fees: totalFee,
        }),
      });
    }
  });
});
