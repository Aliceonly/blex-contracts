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
  buildDecreaseOrderParam,
  buildFees,
} = require("../../../utils/buildParams");
const {
  validSize,
  validTransfer,
  vaildUpdatePositionEvent,
  validBalanceChange,
  validCollateral,
  validAvgPrice,
  validPnl,
  vaildOrderExist,
} = require("../../../utils/vaildData");
const {
  connectIncreasePosition,
  connectUpdateOrder,
  connectUpdateOrderRevert,
} = require("../../../../../scripts/market/marketRouter");
const {
  priceToBigNumber,
  totalFees,
  calcCollateral,
  calcMarketAmount,
  getCurrentPosition,
  calcOpenFee,
  calAveragePrice,
  calcPNL,
  calcCloseFee,
  numberToBigNumber,
  getOrderInfo,
  calcAUM,
  logger,
} = require("../../../utils/utils");
const {
  vaildUpdateOrderEvent,
  vaildOrderCreated,
} = require("../../../utils/vaildOrder");
const { getPrice, setPrice } = require("../../../../../scripts/mock/oracle");
const { balanceOf } = require("../../../../../scripts/mock/erc20");
const {
  getMarketFundsUsed,
  getAUM,
  getUSDBalance,
  getGlobalPnl,
} = require("../../../../../scripts/vault/vaultRouter");
const {
  vaildPosition,
  vaildDecreaseOrder,
} = require("../../../utils/vaildPosition");
const { expect } = require("chai");
const {
  getAccountOrderNumber,
  ordersIndex,
} = require("../../../../../scripts/order/orderStore");
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

  it("Different users can only place ten trigger orders", async () => {
    logger.info("---Different users can only place ten trigger orders----");
    //Execute pre-preparation operations, including setting the price of the oracle machine, mint corresponding to the number of tokens and authorizing them to marketRouter
    await execPrePare({
      user: owner,
      amount: 1000,
      marketRouter: allContracts.marketRouter,
      indexToken: allContracts.indexToken,
      price: 40000,
    });

    let users = [owner, second, third];

    for (let index = 0; index < users.length; index++) {
      //increase position
      {
        await userMintAndApprove(users[index], 1000, allContracts.marketRouter);
        //Build and increase position parameters
        let incParams = buildIncreasePositionParam({
          market: allContracts.market.address,
          price: 40000,
          pay: 1000,
          size: 9000,
          isLong: true,
        });

        //
        await validSize({
          user: users[index].address,
          price: 0,
          isLong: true,
          size: 0,
        });

        //Get the  user current position
        let position = await getCurrentPosition({
          user: users[index].address,
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
        //
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

        //Calculate the collD required for the emit event
        let collD = incParams.collateralDelta.sub(totalFee);

        //increase position
        let lastTx = await connectIncreasePosition(users[index], incParams);
        //Obtain market borrowing funds after the transaction is completed
        let afterMarketFundsUsed = await getMarketFundsUsed(
          allContracts.market.address
        );
        //check
        validBalanceChange(
          incParams._sizeDelta,
          afterMarketFundsUsed.sub(beforeMarketFundsUsed),
          "Check borrow Size"
        );

        //Build event parameter list
        let eventArgs = [
          users[index].address, //account
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
          amount: incParams.collateralDelta,
          fee: totalFee,
        });

        //check  market balance changes
        validBalanceChange(
          marketAmount,
          afterMarketAmount.sub(beforeMarketAmount),
          "check  market balance changes"
        );

        //check  the balance change after the transaction execution is completed
        await validTransfer({
          tokenContract: allContracts.USDC,
          blockNumber: lastTx.blockNumber,
          from: users[index].address,
          to: allContracts.market.address,
          amount: 1000,
          label: "The market accepts funds incorrectly",
        });


        await validSize({
          user: users[index].address,
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
          from: users[index].address,
          to: allContracts.market.address,
          amount: 1000,
          label:
            "The amount transferred to the market by the user does not correspond to the expected value",
        });

        //check collateral
        await validCollateral({
          user: users[index].address,
          price: 40000,
          isLong: incParams._isLong,
          coll: calcCollateral({
            pay: incParams.collateralDelta,
            fees: totalFee,
          }),
        });

        //Check average price
        await validAvgPrice({
          user: users[index].address,
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

        //Get the  user current position
        position = await getCurrentPosition({
          user: users[index].address,
          price: 40000,
          isLong: true,
        });

        //calc pnl
        result = calcPNL({
          position: position,
          price: 40000,
        });

        let pnl = result.hasProfit ? result.pnl : -result.pnl;

        //checkpnl
        await validPnl({
          user: users[index].address,
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
      let orderID = await ordersIndex(users[index].address, "1");
      if (orderID.eq(0)) {
        orderID = BigNumber.from(1);
      }

      {
        for (let j = 0; j < 10; j++) {
          let inputs = buildDecreaseOrderParam({
            market: allContracts.market.address,
            price: 40000 + 500,
            size: 20,
          });

          let oraclePrice = priceToBigNumber(40000 + 500);

          //Get the  user current position
          let ps = await getCurrentPosition({
            user: users[index].address,
            price: 0,
            isLong: true,
          });
          //Calculate the margin to reduce the position of this reduction order

          let collateralDelta = ps.collateral.div(450);

          let fees = buildFees({
            closeFee: calcCloseFee({
              sizeDelta: inputs._order.size,
            }),
            execFee: numberToBigNumber(1),
          });
          let totalFee = totalFees(fees);

          let decrOrderCount = await getAccountOrderNumber(
            users[index].address,
            "1"
          );

          vaildDecreaseOrder({
            collateral: ps.collateral,
            collateralDelta: collateralDelta,
            size: ps.size,
            sizeDelta: inputs._order.size,
            fees: totalFee,
            decrOrderCount: decrOrderCount,
          });

          let eventArg = [
            users[index].address,
            true,
            false,
            orderID,
            allContracts.market.address,
            inputs._order.size,
            collateralDelta,
            oraclePrice,
            true,
            0,
            0,
            0,
            true,
            inputs,
          ];

          //send a transaction
          let tx = await connectUpdateOrder(users[index], inputs);

          //Query whether the order has been inserted
          await vaildOrderExist({
            user: users[index].address,
            orderID,
            label: "1",
          });

          //Construct the validation parameters of the order
          let vaildOrderArgs = [
            users[index].address, //account
            orderID, //orderID,
            collateralDelta, //collateral
            inputs._order.size,
            oraclePrice,
            inputs._order.extra1,
            inputs._order.extra0,
          ];

          //Get the order data written into the contract for this transaction
          let orderInfo = await getOrderInfo({
            user: users[index].address,
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
      //No user can place a maximum of 10 trigger orders, if more than 10, an error will be reported
      {
        //build parameters
        let inputs = buildDecreaseOrderParam({
          market: allContracts.market.address,
          price: 40000 + 500,
          size: 20,
        });

        //send a transaction
        // await expect(connectUpdateOrder(users[index], inputs)).to.be.reverted;
        await connectUpdateOrderRevert(users[index], inputs);
      }
    }
  });
});
