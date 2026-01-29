import Web3 from "web3";
import dotenv from 'dotenv';

dotenv.config();

const ganacheHost = process.env.GANACHE_HOST || process.env.IP || "127.0.0.1";
const web3 = new Web3(`http://${ganacheHost}:7545`);

export async function createAndFundWallet() {
  // 1. Tạo ví mới
  const newAccount = web3.eth.accounts.create();

  console.log("New employee wallet created:", newAccount.address);

  // 2. Lấy ví admin từ Ganache (ví đầu tiên)
  const accounts = await web3.eth.getAccounts();
  const admin = accounts[0];

  // 3. Gửi 0.01 ETH cho ví nhân viên
  const tx = await web3.eth.sendTransaction({
    from: admin,
    to: newAccount.address,
    value: web3.utils.toWei("0.01", "ether"),
    gas: 21000,
  });

  console.log(`Funded 0.01 ETH to ${newAccount.address}`);
  console.log("Transaction hash:", tx.transactionHash);

  // 4. Trả về thông tin ví
  return {
    address: newAccount.address,
    privateKey: newAccount.privateKey,
    fundedTx: tx.transactionHash,
  };
}
