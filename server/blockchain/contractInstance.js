import Web3 from "web3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer explicit GANACHE_HOST env; fall back to legacy IP env for compatibility
const ganacheHost = process.env.GANACHE_HOST || process.env.IP || "127.0.0.1";
const GANACHE_URL = `http://${ganacheHost}:7545`;
const web3 = new Web3(GANACHE_URL);

const empPath = path.join(__dirname, "build", "EmployeeContract.json");
const prodPath = path.join(__dirname, "build", "ProductContract.json");

const empJson = JSON.parse(fs.readFileSync(empPath, "utf8"));
const prodJson = JSON.parse(fs.readFileSync(prodPath, "utf8"));

const empAddress = empJson.address;
const empAbi = empJson.abi;
const prodAddress = prodJson.address;
const prodAbi = prodJson.abi;

const employeeContract = new web3.eth.Contract(empAbi, empAddress);
const productContract = new web3.eth.Contract(prodAbi, prodAddress);

export { web3, employeeContract, productContract };
