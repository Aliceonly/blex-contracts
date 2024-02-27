const { ethers } = require("hardhat");
const {
  setIsEnableMarketConvertToOrder,
  decreasePosition,
  increasePosition,
} = require("../../../../../scripts/market/marketRouter");
const {
  totalFees,
  getCurrentPosition,
  calcOpenFee,
  calcMarketAmount,
  calcCollateral,
  calAveragePrice,
  calcPNL,
  calcCloseFee,
  numberToBigNumber,
  priceToBigNumber,
  calcSlippagePrice,
  getOrderInfo,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const { expect } = require("chai");
const { execPrePare } = require("../../../utils/buildLogic");
const {
  buildIncreasePositionParam,
  buildDecreasePositionParam,
  buildFees,
} = require("../../../utils/buildParams");
const {
  validSize,
  vaildOrderExist,
  validBalanceChange,
  validTransfer,
  validCollateral,
  validAvgPrice,
  validPnl,
  vaildUpdatePositionEvent,
} = require("../../../utils/vaildData");
const {
  deployServiceAllMarket,
  readServiceAllMarket,
  execCancelOrderAndLiqPosition,
} = require("../../../deploy/deployAllContract");
const { setPrice, getPrice } = require("../../../../../scripts/mock/oracle");
const {
  vaildPosition,
  vaildDecreaseOrder,
} = require("../../../utils/vaildPosition");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  deployAutoOrderMock,
  checkIndexAutoOrderMock,
  performIndexAutoOrderMock,
} = require("../../../../../scripts/am/autoOrderMock");
const {
  grantRoleIfNotGranted,
} = require("../../../../../scripts/utils/helpers");
const {
  vaildDeleteOrderEvent,
  vaildUpdateOrderEvent,
  vaildOrderCreated,
} = require("../../../utils/vaildOrder");
const {
  getAccountOrderNumber,
  ordersIndex,
} = require("../../../../../scripts/order/orderStore");
const { BigNumber } = require("ethers");

describe("decreasePostionFromOrder", async () => {
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

  it("decreasePostionFromOrder", async () => {
    logger.info("---decreasePostionFromOrder---");
    //increase position
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
      {
        //Build position opening parameters
        let params = buildIncreasePositionParam({
          market: allContracts.market.address,
          price: 1700,
          pay: 20,
          size: 200,
          isLong: true,
        });

        //
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

        //Get opening fee
        let openFee = calcOpenFee({
          sizeDelta: params._sizeDelta,
        });

        //Construct the various fees of this transaction
        let fees = buildFees({
          openFee: openFee,
        });
        //
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
          "Check borrow Size"
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
          0, //category
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
          "Check AUM valuechange"
        );

        validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

        //Calculate the funds that the market should receive
        let marketAmount = calcMarketAmount({
          amount: params.collateralDelta,
          fee: totalFee,
        });

        //check market bal change
        validBalanceChange(
          marketAmount,
          afterMarketAmount.sub(beforeMarketAmount),
          "check market bal change"
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
          label: "Check user transfers to the market amount",
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
          price: 1700,
          isLong: true,
          price0: calAveragePrice({
            position: position,
            sizeDelta: params._sizeDelta,
            marketPrice: oracelPrice,
            pnl: 0,
            hasProfit: true,
          }),
        });

        //Get the  user current position
        position = await getCurrentPosition({
          user: owner.address,
          price: 1700,
          isLong: true,
        });

        //calc pnl
        result = calcPNL({
          position: position,
          price: 1700,
        });

        let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

        //checkpnl
        await validPnl({
          user: owner.address,
          price: 1700,
          isLong: true,
          pnl: pnl,
        });

        //check  event and corresponding parameters
        await vaildUpdatePositionEvent({
          contract: allContracts.marketRouter,
          tx: lastTx,
          args: eventArgs,
        });
      }
    }

    await setIsEnableMarketConvertToOrder(true);
    let orderID = await ordersIndex(owner.address, "1");
    if (orderID.eq(0)) {
      orderID = BigNumber.from(1);
    }

    {
      //Get user position
      let position = await getCurrentPosition({
        user: owner.address,
        price: 1690,
        isLong: true,
      });

      let decParams = buildDecreasePositionParam({
        market: allContracts.market.address,
        price: 1690,
        size: 100,
      });

      //build the list of fees required for this decrease position
      let fees = buildFees({
        closeFee: calcCloseFee({ sizeDelta: decParams._sizeDelta }),
      });

      let totalsFee = totalFees(fees);
      //Get oracle price
      let oracelPrice = await getPrice(allContracts.indexToken, true);
      //
      decParams._oraclePrice = oracelPrice;

      //check position
      vaildPosition({
        params: decParams,
        position,
        fees,
      });

      let decrOrderCount = await getAccountOrderNumber(owner.address, "1");

      vaildDecreaseOrder({
        collateral: position.collateral,
        collateralDelta: decParams.collateralDelta,
        size: position.size,
        sizeDelta: decParams._sizeDelta,
        fees: totalsFee,
        decrOrderCount: decrOrderCount,
      });

      //Get the margin subtracted from position this time
      let collateral = position.collateral.div(2);

      let lastTx = await decreasePosition(decParams);

      //Calculate slippage
      let slippagePrice = calcSlippagePrice({
        price: priceToBigNumber(1690),
        isLong: true,
        isOpen: false,
        slippage: 30,
      });

      //Build event parameter list
      let eventArg = [
        owner.address, //account
        true, //isLong
        false, // isOpen
        orderID, //orderID
        allContracts.market.address, // market
        decParams._sizeDelta, // size
        collateral, //collateral
        slippagePrice, //
        true, //getTriggerAbove
        0, //tp
        0, //sl
        0, //fromOrder
        true, //isKeepLev
      ];

      await vaildUpdateOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [eventArg],
      });
      //todo---------- 1 ->0
      //Construct the validation parameters of the order
      let vaildOrderArgs = [
        owner.address, //account
        orderID, //orderID,
        collateral, //collateral
        decParams._sizeDelta,
        slippagePrice,
        1,
        0,
      ];

      //Get the order data written into the contract for this transaction
      let orderInfo = await getOrderInfo({
        user: owner.address,
        orderID,
        label: "1",
      });

      //check  the data written this time
      vaildOrderCreated({
        order: orderInfo,
        args: vaildOrderArgs,
      });

      await vaildOrderExist({
        user: owner.address,
        orderID,
        label: "1",
      });
    }
    //Set the oracle price
    await setPrice(allContracts.indexToken, 1700);

    //execute order
    {
      let position = await getCurrentPosition({
        user: owner.address,
        price: 0,
        isLong: true,
      });
      //Get executable orders
      let execOrders = await checkIndexAutoOrderMock(0, 100, false, true);

      expect(execOrders.length, "Get order quantity does not match").to.equal(
        1
      );

      let fees = buildFees({
        openFee: calcCloseFee({ sizeDelta: execOrders[0].size }),
        execFee: numberToBigNumber(1),
      });

      let beforeMarketAmount = await balanceOf(allContracts.market.address);
      let beforeAum = await getAUM();
      let beforeUSD = await getUSDBalance();
      let beforePNL = await getGlobalPnl();

      let beforeCalcAum = calcAUM(beforePNL, beforeUSD);
      let beforeMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      let totalFee = totalFees(fees);
      //execute order
      let lastTx = await performIndexAutoOrderMock(0, 100, false, true);
      let afterMarketFundsUsed = await getMarketFundsUsed(
        allContracts.market.address
      );

      //Get the market balance after the transaction is completed
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

      //Check borrow Size
      validBalanceChange(
        execOrders[0].size,
        beforeMarketFundsUsed.sub(afterMarketFundsUsed),
        "Check borrow Size"
      );
      //Successful order execution needs to check  feeRouter
      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: allContracts.allFee.feeVault.address,
        amount: totalFee,
        label: "check  the amount transferred from market to feeVault",
        expandDecimals: false,
      });

      let delEventArg = [
        owner.address, //account
        true, //isLong
        false, //isOpen
        orderID, //order
        allContracts.market.address, //market
        3, //delete reason: exec is executed
        priceToBigNumber(1700), //triggerAbove
        0, //pnl
      ];

      await vaildDeleteOrderEvent({
        contract: allContracts.marketRouter,
        tx: lastTx,
        args: [delEventArg],
      });

      await validSize({
        user: owner.address,
        price: 0,
        isLong: true,
        size: 100,
      });

      //Check user average price
      await validAvgPrice({
        user: owner.address,
        price: 0,
        isLong: true,
        price0: calAveragePrice({
          position: position,
          sizeDelta: execOrders[0].size,
          marketPrice: priceToBigNumber(1700),
          pnl: 0,
          hasProfit: true,
        }),
      });

      let result = calcPNL({
        position,
        price: 1700,
      });

      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      await validPnl({
        user: owner.address,
        price: 1700,
        isLong: true,
        pnl,
      });

      //
      validBalanceChange(
        position.collateral.div(2),
        beforeMarketAmount.sub(afterMarketAmount),
        "check collateral change"
      );

      await validTransfer({
        tokenContract: allContracts.USDC,
        blockNumber: lastTx.blockNumber,
        from: allContracts.market.address,
        to: owner.address,
        amount: position.collateral.div(2).sub(totalFee),
        label: "Get the fund amount after check user close a position",
        expandDecimals: false,
      });

      await validCollateral({
        user: owner.address,
        price: 0,
        isLong: true,
        coll: calcCollateral({
          pay: position.collateral.div(2),
          fees: 0,
        }),
      });
    }
  });
});
