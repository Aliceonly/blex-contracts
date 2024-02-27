const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  userMintAndApprove,
  deployTmpTestFactoryContract,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  calcAUM,
  calcMarketAmount,
  calcPNL,
  calcCollateral,
  calAveragePrice,
  advanceOneDay,
  advanceTimeStamp,
  calcCloseFee,
  numberToBigNumber,
} = require("../../../utils/utils");
const {
  getCumulativeFundingRates,
} = require("../../../../../scripts/fee/feeVault");
const { getFundingFee } = require("../../../utils/fundingFee");
const {
  buildIncreasePositionParam,
  buildFees,
} = require("../../../utils/buildParams");
const { getPrice } = require("../../../../../scripts/mock/oracle");
const { validateIncreasePosition } = require("../../../utils/globalVaild");
const {
  vaildPosition,
  validateLiquidation,
} = require("../../../utils/vaildPosition");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  getAUM,
  getUSDBalance,
  getGlobalPnl,
  getMarketFundsUsed,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  getGlobalPNL,
  increasePosition,
  connectIncreasePosition,
} = require("../../../../../scripts/market/marketRouter");
const {
  validBalanceChange,
  validSize,
  validTransfer,
  validPnl,
  validCollateral,
  validAvgPrice,
  vaildUpdatePositionEvent,
} = require("../../../utils/vaildData");
const {
  checkIndexAutoLiqMock,
  performIndexAutoLiqMock,
} = require("../../../../../scripts/am/autoLiqMock");
const { expect } = require("chai");

//
describe("The sum of fees is greater than the user's position", async () => {
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

  it("The sum of fees is greater than the user's position,should be liquidated", async () => {
    await execPrePare({
      user: owner,
      amount: 20,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1800,
    });
    //increase position
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
        price: 1800,
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

      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 1800,
        pay: 20,
        size: 90,
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

      //Sum up the various fees
      let totalFee = totalFees(fees);
      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      //Used to check  the position
      params._oraclePrice = oracelPrice;
      await validateIncreasePosition({
        _inputs: params,
        user: owner.address,
        collateralToken: allContracts.collateralToken,
      });
      // check  the position
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
      //Open Position

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
      let afterUSD = await getUSDBalance();
      let afterPNL = await getGlobalPnl();

      let afterCalcAUM = calcAUM(afterPNL, afterUSD);

      validBalanceChange(
        afterCalcAUM.sub(beforeCalcAum),
        afterAum.sub(beforeAum),
        "Check AUM value change"
      );
      //Only Open Position AUM will not change anything
      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");
      //check  user's position after trade execution
      await validSize({
        user: owner.address,
        price: 1800,
        size: 90,
      });
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
        amount: 20,
        label: "check  the amount transferred by the user to the market",
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
        price: 1800,
      });
      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);
      await validPnl({
        user: owner.address,
        price: 1800,
        isLong: true,
        pnl: pnl,
      });

      //check collateral
      await validCollateral({
        user: owner.address,
        price: 1800,
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

    //advance one year 86400*365
    await advanceTimeStamp(86400 * 365);
    //When initiating a transaction, the user will synchronize the advanced time to the blockchain
    {
      await userMintAndApprove(owner, 200, allContracts.marketRouter);

      let incParams = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 1800,
        pay: 200,
        size: 2000,
        isLong: false,
      });

      await connectIncreasePosition(owner, incParams);

      await validSize({
        user: owner.address,
        price: 1800,
        isLong: false,
        size: 2000,
      });
    }
    //Calculate the funding fee locally
    {
      let position = await getCurrentPosition({
        user: owner.address,
        price: 1800,
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

      let fees = buildFees({
        closeFee: calcCloseFee({ sizeDelta: position.size }),
        liqFee: numberToBigNumber(1),
        fundFee: fundingFee,
      });
      let totalFee = totalFees(fees);
      let result = calcPNL({
        position,
        price: 1800,
      });
      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      //to liquidate

      let orderArr = await checkIndexAutoLiqMock(
        0,
        100,
        allContracts.market.address,
        true
      );

      expect(
        orderArr.length,
        "Unqueried positions that meet the liquidation standard"
      ).to.be.eq(1);
      //Get Liq Fee
      //   let liqFee=await

      expect(
        validateLiquidation({
          pnl,
          fees: totalFee,
          liquidateFee: numberToBigNumber(1),
          collateral: position.collateral,
          size: position.size,
          _raise: false,
        }),
        "Not an expected liquidation condition"
      ).eq(1);

      //execute liquidation
      let lastTx = await performIndexAutoLiqMock(
        0,
        100,
        allContracts.market.address,
        true
      );

      let collateralDelta = position["collateral"];
      let sizeDelta = position["size"];

      let oraclePrice = await getPrice(allContracts.indexToken, true);

      //Build event parameter list
      let eventArg = [
        owner.address, //account
        collateralDelta, //collateralDelta
        collateralDelta, //collateralDelta
        sizeDelta, //sizeDelta
        true, //isLong
        oraclePrice, //oraclePrice,
        pnl, //realisedPnl,
        fees, //fees
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indexToken
        4, //category
        0, //fromOrder
      ];

      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArg,
      });

      //Transfer all  collateral deposits to feeVault
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: position.collateral,
        label: "check  the amount transferred from market to feeVault",
        expandDecimals: false,
      });
    }
  });
});
