// deploy.js
import fs from "fs/promises";
import path from "path";
import solc from "solc";
import Web3 from "web3";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer explicit GANACHE_HOST env; fall back to legacy IP env for compatibility
const ganacheHost = process.env.GANACHE_HOST || process.env.IP || "192.168.1.236";
const GANACHE_URL = `http://${ganacheHost}:7545`;
const CONTRACT_SRC_EMP = path.join(__dirname, "contracts", "EmployeeContract.sol");
const CONTRACT_SRC_PRODUCT = path.join(__dirname, "contracts", "ProductContract.sol");
const BUILD_DIR = path.join(__dirname, "build");
const OUTPUT_EMP = path.join(BUILD_DIR, "EmployeeContract.json");
const OUTPUT_PRODUCT = path.join(BUILD_DIR, "ProductContract.json");

async function compileContract() {
  console.log("⏳ Compiling EmployeeContract...");
  const srcEmp = await fs.readFile(CONTRACT_SRC_EMP, "utf8");
  const srcProd = await fs.readFile(CONTRACT_SRC_PRODUCT, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "EmployeeContract.sol": { content: srcEmp },
      "ProductContract.sol": { content: srcProd },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    for (const e of output.errors) {
      if (e.severity === "error") console.error(e.formattedMessage);
    }
    if (output.errors.some((e) => e.severity === "error")) {
      throw new Error("Solidity compilation failed");
    }
  }

  const emp = output.contracts["EmployeeContract.sol"]["EmployeeContract"];
  const prod = output.contracts["ProductContract.sol"]["ProductContract"];
  return {
    employee: { abi: emp.abi, bytecode: emp.evm.bytecode.object },
    product: { abi: prod.abi, bytecode: prod.evm.bytecode.object },
  };
}

async function deploy() {
  const { employee, product } = await compileContract();

  const web3 = new Web3(GANACHE_URL);
  const accounts = await web3.eth.getAccounts();
  const deployer = accounts[0];

  console.log("Deploying from account:", deployer);

  // Deploy EmployeeContract
  const EmpContract = new web3.eth.Contract(employee.abi);
  const deployedEmp = await EmpContract.deploy({ data: "0x" + employee.bytecode }).send({
    from: deployer,
    gas: 3000000,
  });
  const empAddress = deployedEmp.options.address;
  console.log("EmployeeContract deployed at:", empAddress);

  // Deploy ProductContract
  const ProdContract = new web3.eth.Contract(product.abi);
  const deployedProd = await ProdContract.deploy({ data: "0x" + product.bytecode }).send({
    from: deployer,
    gas: 3000000,
  });
  const prodAddress = deployedProd.options.address;
  console.log("ProductContract deployed at:", prodAddress);

  await fs.mkdir(BUILD_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_EMP, JSON.stringify({ address: empAddress, abi: employee.abi }, null, 2), "utf8");
  await fs.writeFile(OUTPUT_PRODUCT, JSON.stringify({ address: prodAddress, abi: product.abi }, null, 2), "utf8");
  console.log("ABI & Address saved to:", BUILD_DIR);
}

deploy().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});