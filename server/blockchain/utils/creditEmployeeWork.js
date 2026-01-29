import { web3, employeeContract as contract } from "../contractInstance.js";

/**
 * Credit ETH to employee based on checkin/checkout times
 * @param {string} userCode - Employee user code
 * @param {number} checkin - Unix timestamp in seconds
 * @param {number} checkout - Unix timestamp in seconds
 * @returns {Promise<{message: string, minutes: number, amountEth: string, transferTx: string, recordTx: string}>}
 */
export async function creditEmployeeWork(userCode, checkin, checkout) {
  try {
    
    // get employee wallet
    const emp = await contract.methods.getEmployee(userCode).call();
    if (!emp || !emp[0]) {
      throw new Error("Employee not found");
    }
    const wallet = emp[6];

    // compute minutes and amount (0.1 ETH per minute)
    const seconds = Number(checkout) - Number(checkin);
    if (seconds <= 0) {
      throw new Error("Invalid time range");
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes <= 0) {
      return { message: "Less than 1 minute, nothing to credit", minutes: 0, amountEth: "0" };
    }

    const amountEth = (0.1 * minutes).toString();
    const amountWei = web3.utils.toWei(amountEth, "ether");

    // send ETH from owner (ganache account[0]) to employee wallet
    const accounts = await web3.eth.getAccounts();
    const owner = accounts[0];

    const sendTx = await web3.eth.sendTransaction({ from: owner, to: wallet, value: amountWei, gas: 21000 });

    // record on-chain in contract (bookkeeping)
    const receipt = await contract.methods.creditForWork(userCode, Number(checkin), Number(checkout)).send({ from: owner, gas: 3000000 });
    
    return {
      message: "Credited",
      minutes,
      amountEth,
      transferTx: sendTx.transactionHash,
      recordTx: receipt.transactionHash,
    };
  } catch (err) {
    console.log("❌ Error in creditEmployeeWork:", err);

    throw err;
  }
}
