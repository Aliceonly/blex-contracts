const { ethers } = require("hardhat");
const { request } = require("graphql-request");
const query = `query MyQuery {
  trades {
    status
    statusCode
    hash
    side
  }
}`;

const graphApiEndpoint = `https://api.thegraph.com/subgraphs/name/blex-dex/${process.env.HARDHAT_NETWORK}`;

async function sendGraphQLRequestAndCalculateTotalAmount(
  statusList,
  myLabel,
  isOpen = null
) {
  request(graphApiEndpoint, query)
    .then(async function (data) {
      const mySet = new Set();
      for (let index = 0; index < data["trades"].length; index++) {
        const element = data["trades"][index];
        if (isOpen == null) {
          if (statusList.includes(element.statusCode)) mySet.add(element.hash);
        } else {
          const isOpenStr = isOpen ? "Open" : "Close";

          if (
            statusList.includes(element.statusCode) &&
            String(element.side).indexOf(isOpenStr) >= 0
          ) {

            mySet.add(element.hash);
          }
        }
      }

      let totalGas = ethers.BigNumber.from("0");
      // Loop through the transactions in the block
      let hashListLength = 0;
      for (const txHash of mySet) {
        const ppp = await getGasCost(txHash);
        totalGas = totalGas.add(ppp);
        hashListLength += 1;
      }

      let logLabel;
      if (isOpen == null) logLabel = `${myLabel}`;
      else logLabel = `${myLabel}-${isOpen ? "Open" : "Close"}`;
      if (hashListLength == 0) {
        console.log(logLabel + " no transactions");
        return;
      }
      const ttt = totalGas.div(ethers.BigNumber.from(String(hashListLength)));
      console.log(logLabel, ethers.utils.formatUnits(ttt, 18));
    })
    .catch((error) => console.error("lookup error:", error));
}

async function getGasCost(txHash) {
  try {
    // Get the transaction receipt using the transaction hash
    const receipt = await ethers.provider.getTransactionReceipt(txHash);

    // If the receipt exists and contains gasUsed information
    if (receipt && receipt.gasUsed) {
      const tx = await ethers.provider.getTransaction(txHash);
      const gasPrice = tx.gasPrice;
      const gasUsed = receipt.gasUsed;
      const gasCost = gasPrice.mul(gasUsed);

      return gasCost;
    } else {
      console.log(
        "Transaction receipt not found or gasUsed information not available."
      );
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
  return ethers.BigNumber.from("0");
}

/**
enum CancelReason {
  Padding,//0
  Liquidation,//1
  PositionClosed,//2
  Executed,//3
  TpAndSlExecuted,//4
  Canceled,//5
  SysCancel, //6
  PartialLiquidation,//7
  MarketRequest, //8
  BeyondPrice //9
} 
*/
/**   
== 8
|| element.statusCode == 6
|| element.statusCode == 3
|| element.statusCode == 4 
*/

async function runMain() {
  await sendGraphQLRequestAndCalculateTotalAmount([1], "Liq");
  await sendGraphQLRequestAndCalculateTotalAmount([3, 4, 6, 8], "Order", true);
  await sendGraphQLRequestAndCalculateTotalAmount([3, 4, 6, 8], "Order", false);
}

runMain().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
