const { ethers } = require("hardhat");
const {
  deployServiceAllMarket,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
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
  getCollateral,
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
  decreasePosition,
} = require("../../../../../scripts/market/marketRouter");
const { BigNumber } = require("ethers");

describe("test case", async () => {
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
      amount: 20,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 1700,
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
        price: 1700,
        isLong: true,
      });
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 1700,
        size: 200,
        pay: 20,
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
        price: 1700,
        size: 200,
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
        amount: 20,
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
        price: 1700,
      });
      let pnl = result.hasProfit ? result.pnl : -result.pnl;
      await validPnl({
        user: owner.address,
        price: 1700,
        isLong: true,
        pnl: pnl,
      });

      //check collateral
      await validCollateral({
        user: owner.address,
        price: 1700,
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

    let beforeAum = await getAUM();
    let beforeUSD = await getUSDBalance();
    let beforePNL = await getGlobalPnl();

    let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

    //Set the oracle price calc AUM
    await setPrice(allContracts.indexToken, 1710);

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

    //Execution of position reduction
    {
      let decParams = buildDecreasePositionParam({
        market: allContracts.market.address,
        price: 1710,
        size: 100,
        isKeepLev: false,
      });

      let ps = await getCurrentPosition({
        user: owner.address,
        price: 1710,
        isLong: true,
      });
      //
      let fees = buildFees({
        openFee: calcCloseFee({ sizeDelta: decParams._sizeDelta }),
      });
      let totalFee = totalFees(fees);
      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      decParams._oraclePrice = oracelPrice;
      //check position
      vaildPosition({
        params: decParams,
        position: ps,
        fees,
      });

      let collateral = ps.collateral.div(2);

      let result = calcPNL({
        position: ps,
        price: 1710,
      });
      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      let realisedPnl = pnl.div(2);

      let eventArgs = [
        owner.address, //account
        0, //collateral
        0, //collD Don’t keep the leverage, the margin is still in the position, because the profit is made, so the fees are deducted from the pnl
        decParams._sizeDelta, //sizeDelta
        true, //isLong
        oracelPrice, // oraclePrice
        realisedPnl, //pnl
        fees, // fees []int
        allContracts.market.address, //market
        allContracts.collateralToken, //collateralToken
        allContracts.indexToken, // indextoken
        1, //category
        0, //fromOrder
      ];

      //Get market borrow funds before trading
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);

      ////increase position
      let lastTx = await decreasePosition(decParams);

      //Obtain market borrowing funds after the transaction is completed
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

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

      //check
      validBalanceChange(
        decParams._sizeDelta,
        beforeMarketFundsUsed.sub(afterMarketFundsUsed),
        "Check borrow Size"
      );
      //Without maintaining leveraged profits, the profits will partially cover the expenses, and the market funds will not change
      validBalanceChange(
        BigNumber.from(0),
        beforeMarketAmount.sub(afterMarketAmount),
        "check  market balance changes"
      );

      //After executing the transaction, check the user's position
      await validSize({
        user: owner.address,
        price: 1710,
        size: 100,
        isLong: true,
      });

      //check collateral
      await checkCollateral({
        user: owner.address,
        price: 1710,
        isLong: decParams._isLong,
        coll: calcCollateral({
          pay: ps.collateral,
          fees: 0,
        }),
      });

      //check feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "checkBalance received by feeRouter",
        expandDecimals: false,
      });

      //check vault balance changes
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.lpContracts.vault.address,
        to: allContracts.market.address,
        amount: realisedPnl,
        label: "check vault balance changes",
        expandDecimals: false,
      });

      //check  user balance changes
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: owner.address,
        amount: realisedPnl.sub(totalFee),
        label: "check  user balance changes",
        expandDecimals: false,
      });

      //emit event;
      await vaildUpdatePositionEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: eventArgs,
      });
    }
  });
});
