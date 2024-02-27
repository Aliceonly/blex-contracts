const { ethers } = require("hardhat");
const {
  increasePosition,
  connectUpdateOrder,
  connectUpdateOrderRevert,
} = require("../../../../../scripts/market/marketRouter");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const { getPrice } = require("../../../../../scripts/mock/oracle");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
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
  buildDecreaseOrderParam,
} = require("../../../utils/buildParams");
const {
  getCurrentPosition,
  calcOpenFee,
  totalFees,
  calcMarketAmount,
  calcCollateral,
  calAveragePrice,
  calcPNL,
  getCollateral,
  priceToBigNumber,
  calcCloseFee,
  numberToBigNumber,
  getOrderInfo,
  calcSlippagePrice,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  validSize,
  validBalanceChange,
  validTransfer,
  validCollateral,
  validPnl,
  vaildUpdatePositionEvent,
  validAvgPrice,
  vaildOrderExist,
} = require("../../../utils/vaildData");
const {
  vaildPosition,
  vaildDecreaseOrder,
} = require("../../../utils/vaildPosition");
const {
  vaildUpdateOrderEvent,
  vaildOrderCreated,
} = require("../../../utils/vaildOrder");
const { expect } = require("chai");
const {
  getAccountOrderNumber,
  ordersIndex,
} = require("../../../../../scripts/order/orderStore");
const { BigNumber } = require("ethers");

describe("Test limit order trigger limit - up to 10 triggers", async () => {
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

  it("Up to 10 triggers", async () => {
    logger.info("---Up to 10 triggers----");
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 1000,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });

    //Open Position
    {
      //Build position opening parameters
      let params = buildIncreasePositionParam({
        market: allContracts.market.address,
        price: 40000,
        pay: 1000,
        size: 9000,
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
        "Check AUM value change"
      );

      validBalanceChange(afterCalcAUM, afterAum, "Check AUM value");

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
        price: 40000,
        size: 9000,
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
        amount: 1000,
        label: "Check user transfers to the market amount",
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
        price: 40000,
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
        price: 40000,
        isLong: true,
      });

      //calc pnl
      result = calcPNL({
        position: position,
        price: 40000,
      });

      let pnl = result.hasProfit ? result.pnl : result.pnl.mul(-1);

      //checkpnl
      await validPnl({
        user: owner.address,
        price: 40000,
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
    //Place 10 trigger orders
    let orderID = await ordersIndex(owner.address, "1");
    {
      for (let index = 0; index < 10; index++) {
        //Build decrease position Parameters
        let inputs = buildDecreaseOrderParam({
          market: allContracts.market.address,
          price: 40000 + 500,
          size: 20,
        });

        ////calc triggerPrice
        let triggerPrice = priceToBigNumber(40500);
        //Get the  user current position
        let position = await getCurrentPosition({
          user: owner.address,
          price: 0,
          isLong: true,
        });

        //List of fees required to construct this lighten-up
        let fees = buildFees({
          closeFee: calcCloseFee({ sizeDelta: inputs._order.size }),
          execFee: numberToBigNumber(1),
        });

        let totalFee = totalFees(fees);

        let decrOrderCount = await getAccountOrderNumber(owner.address, "1");

        //check decrease position parameters
        vaildDecreaseOrder({
          collateral: position.collateral,
          collateralDelta: inputs._order.collateral,
          size: position.size,
          sizeDelta: inputs._order.size,
          fees: totalFee,
          decrOrderCount: decrOrderCount,
        });

        let collateralDelta = position.collateral.div(450);

        let eventArg = [
          owner.address,
          true,
          false,
          orderID,
          allContracts.market.address,
          inputs._order.size,
          collateralDelta,
          triggerPrice,
          true,
          0,
          0,
          0,
          true,
          inputs,
        ];

        // let triggerPrice=calcSlippagePrice({
        //   price:
        // })

        //send a transaction
        let tx = await connectUpdateOrder(owner, inputs);
        //Query whether the order has been inserted
        await vaildOrderExist({
          user: owner.address,
          orderID,
          label: "1",
        });

        //Construct the validation parameters of the order
        let vaildOrderArgs = [
          owner.address, //account
          orderID, //orderID,
          collateralDelta, //collateral
          inputs._order.size,
          triggerPrice,
          inputs._order.extra1,
          inputs._order.extra0,
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

        //check  event parameters
        await vaildUpdateOrderEvent({
          contract: allContracts.marketRouter,
          tx: tx,
          args: [eventArg],
        });
        orderID = orderID.add(1);
      }
    }
    {
      //Build decrease position Parameters
      let inputs = buildDecreaseOrderParam({
        market: allContracts.market.address,
        price: 40000 + 500,
        size: 20,
      });

      //send a transaction
      //await expect(connectUpdateOrder(owner, inputs)).to.be.reverted;
      await connectUpdateOrderRevert(owner, inputs);
    }
  });
});
