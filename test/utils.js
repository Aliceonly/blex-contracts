async function deployUnitTest(name, args = [], label, options, shouldLog = false) {
    let keyInfo;
    let info = name;
    const contractFactory = await ethers.getContractFactory(name);
    let contract;
    if (options) {
        contract = await contractFactory.deploy(...args, options);
    } else {
        contract = await contractFactory.deploy(...args);
    }
    const receipt = await contract.deployTransaction.wait();
    if (receipt.status === 1) {
        if (shouldLog) console.log(
            // `${keyInfo} deploy success, txHash: %s, gasUsed: %s, total gasUsed: %s`,
            receipt.transactionHash,
            receipt.gasUsed,
            (totalGasUsed += Number(receipt.gasUsed))
        );
    } else {
        console.error(`${keyInfo} deploy failed, receipt: %s`, receipt);
        process.exit()
    }
    if (shouldLog) console.info("%s... Completed!", keyInfo);
    return contract;
}

// ========================
// ========================
async function handleTx(txPromise, label) {
    let promiseInfo = label ? label : "contract function";
    await txPromise.then(
        async (pendingTx) => {
            const tx = await pendingTx;
            const gasLimit = tx.gasLimit.toNumber();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.toNumber();
            // if (gasUsed > 100 * 10000) {
            //     console.trace();
            //     console.error(`${promiseInfo},gas op todo.`);
            //     process.exit();
            // }
            const gasLeft = gasLimit - gasUsed;
            console.log(
                `${promiseInfo}, txHash: %s, gasUsed: %s, gasLeft: %s`,
                receipt.transactionHash,
                gasUsed,
                gasLeft
            );
            if (gasLeft < 200000) {
                console.error("Low gas left. Transaction may fail.");
                process.exit();
            }
            if (receipt.status === 1) {
                // success
            } else {
                console.error(
                    `${promiseInfo} executing failed, receipt: %s`,
                    receipt
                );
                process.exit();
            }
        },
        (error) => {
            console.error(
                "failed to execute transaction: %s, error: %s",
                promiseInfo,
                error
            );
            process.exit();
        }
    );
}

module.exports = {
    deployUnitTest,
    handleTx
};
