import Web3 from "web3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createAndFundWallet } from "../blockchain/utils/walletManager.js";
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc ABI + address sau khi deploy
const buildPath = path.join(__dirname, "../blockchain/build/EmployeeContract.json");
const { abi, address: contractAddress } = JSON.parse(fs.readFileSync(buildPath));

const ganacheHost = process.env.GANACHE_HOST || process.env.IP || "127.0.0.1";
const web3 = new Web3(`http://${ganacheHost}:7545`);
const contract = new web3.eth.Contract(abi, contractAddress);

export async function addEmployee(req, res) {
  try {
    const { name, position, salary } = req.body;

    // Tạo ví mới + nạp 0.1 ETH
    const { address: wallet } = await createAndFundWallet();

    // Lấy ví admin (chủ contract)
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];

    // Gọi smart contract để thêm nhân viên
    const tx = await contract.methods
      .addEmployee(name, position, salary, wallet)
      .send({ from: admin, gas: 3000000 });

    res.status(200).json({
      message: "Employee added successfully!",
      wallet,
      txHash: tx.transactionHash,
    });
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ error: err.message });
  }
}
