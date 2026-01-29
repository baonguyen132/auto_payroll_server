import express from "express";
import { web3, employeeContract as contract } from "../blockchain/contractInstance.js";
import { createAndFundWallet } from "../blockchain/utils/walletManager.js";
import multer from "multer";
import ipfs, { ipfsUrl } from "../blockchain/ipfsClient.js";
import { authenticateToken } from "../middleware/authenticateToken.js";
import connection from "../services/connectDatabase.js";
import { creditEmployeeWork } from "../blockchain/utils/creditEmployeeWork.js";

const employeeRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to safely convert objects containing BigInt into JSON-serializable structures
function safeJson(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

// Helper to convert decimal string/number to 0x-prefixed hex using BigInt
function toHexBn(value) {
  try {
    // If already hex string, return as-is
    if (typeof value === 'string' && value.startsWith('0x')) return value;
    return '0x' + BigInt(value).toString(16);
  } catch (e) {
    // fallback to web3.utils.toHex if available
    try {
      return web3.utils.toHex(value);
    } catch (e2) {
      throw e; // rethrow original
    }
  }
}

/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: Giao tiếp với Smart Contract EmployeeRegistry
 */

/**
 * @swagger
 * /api/employee:
 *   get:
 *     summary: Lấy danh sách tất cả nhân viên từ blockchain
 *     tags: [Employee]
 *     responses:
 *       200:
 *         description: Danh sách nhân viên được lấy thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userCode: { type: string, example: "EMP001" }
 *                   fullName: { type: string, example: "Nguyen Van A" }
 *                   email: { type: string, example: "vana@example.com" }
 *                   phone: { type: string, example: "0909123456" }
 *                   department: { type: string, example: "Finance" }
 *                   position: { type: string, example: "Accountant" }
 *                   wallet: { type: string, example: "0x1234abcd..." }
 *                   createdAt: { type: integer, example: 1729205123 }
 *                   active: { type: boolean, example: true }
 *       500:
 *         description: Lỗi khi lấy danh sách nhân viên
 */
employeeRouter.get("/employee", authenticateToken, async (req, res) => {
  const userData = req.user;

  // Chặn role 3 không được thêm nhân viên
  if (userData.role_id === 3) {
    return res.status(403).json({ message: "Access denied for this role" });
  }
  try {
    const employees = await contract.methods.getAllEmployees().call();

    const formatted = employees.map(emp => ({
      userCode: emp.userCode,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      wallet: emp.wallet,
      createdAt: Number(emp.createdAt),
      active: emp.active,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/employee/{userCode}:
 *   get:
 *     summary: Lấy thông tin chi tiết của một nhân viên theo userCode
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: userCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã nhân viên duy nhất
 *     responses:
 *       200:
 *         description: Thông tin nhân viên
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userCode: { type: string }
 *                 fullName: { type: string }
 *                 email: { type: string }
 *                 phone: { type: string }
 *                 department: { type: string }
 *                 position: { type: string }
 *                 wallet: { type: string }
 *                 createdAt: { type: integer }
 *                 active: { type: boolean }
 *       404:
 *         description: Không tìm thấy nhân viên
 *       500:
 *         description: Lỗi khi truy vấn blockchain
 */
employeeRouter.get("/employee/:userCode", authenticateToken, async (req, res) => {

  const userData = req.user;
  const { userCode } = req.params;
  // Xem coi userCode có trùng với user id của token không
  if (userData.id !== Number(userCode)) {
    return res.status(403).json({ message: "Access denied for this role" });
  }
  try {
    const data = await contract.methods.getEmployee(userCode).call();

    if (!data[0]) return res.status(404).json({ error: "Employee not found" });

    const formatted = {
      userCode: data[0],
      fullName: data[1],
      email: data[2],
      phone: data[3],
      department: data[4],
      position: data[5],
      wallet: data[6],
      createdAt: Number(data[7]),
      active: data[8],
    };

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/employee:
 *   post:
 *     summary: Thêm nhân viên mới vào blockchain
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - department
 *               - position
 *               - username
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Tran Thi B"
 *               email:
 *                 type: string
 *                 example: "tranb@example.com"
 *               phone:
 *                 type: string
 *                 example: "0911222333"
 *               department:
 *                 type: string
 *                 example: "HR"
 *               position:
 *                 type: string
 *                 example: "Manager"
 *               username:
 *                 type: string
 *                 example: "tranb"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Nhân viên được thêm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 txHash:
 *                   type: string
 *                   example: "0xabc123..."
 *                 wallet:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: "0x4567..."
 *                     privateKey:
 *                       type: string
 *                       example: "0x9876..."
 *       403:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi máy chủ
 */
employeeRouter.post("/employee", authenticateToken, async (req, res) => {
  const userData = req.user;

  // Chặn role 3 không được thêm nhân viên
  if (userData.role_id === 3) {
    return res.status(403).json({ message: "Access denied for this role" });
  }

  try {
    const { fullName, email, phone, department, position, username, password } = req.body;

    //  1. Thêm user mới
    const [insertResult] = await connection
      .promise()
      .query(
        "INSERT INTO users (username, password, role_id,wallet_address,private_key) VALUES (?, ?, ?, ?, ?)",
        [username, password, 3, "0x0000000000000000000000000000000000000000", "0x9876543210987654321098765432109876543210"]
      );

    const userId = insertResult.insertId;

    // 2. Tạo ví blockchain cho nhân viên
    const employeeWallet = await createAndFundWallet(); // { address, privateKey }

    // 3. Ghi lên blockchain
    const accounts = await web3.eth.getAccounts();
    const owner = accounts[0];

    const receipt = await contract.methods
      .registerEmployee(
        userId.toString(),
        fullName,
        email,
        phone,
        department,
        position,
        employeeWallet.address
      )
      .send({ from: owner, gas: 3000000 });

    //  4. Cập nhật ví và khóa riêng trong database
    await connection
      .promise()
      .query(
        "UPDATE users SET wallet_address = ?, private_key = ? WHERE id = ?",
        [employeeWallet.address, employeeWallet.privateKey, userId]
      );

    //  5. Trả kết quả cho client
    res.json({
      userCode: userId,
      fullName,
      email,
      phone,
      department,
      position,
      wallet: {
        address: employeeWallet.address,
        privateKey: employeeWallet.privateKey,
      },
      txHash: receipt.transactionHash,
    });
  } catch (err) {
    console.error("❌ Error adding employee:", err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /api/employee/{userCode}/avatar:
 *   post:
 *     summary: Upload ảnh đại diện nhân viên và lưu lên IPFS
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: userCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã nhân viên
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Ảnh đã được tải lên IPFS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cid:
 *                   type: string
 *                   example: "bafybeig7..."
 *                 url:
 *                   type: string
 *                   example: "https://ipfs.io/ipfs/bafybeig7..."
 */
employeeRouter.post("/employee/:userCode/avatar", upload.single("avatar") , async (req, res) => {
  try {
    const { userCode } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload file buffer lên IPFS local
    const { path: cid } = await ipfs.add(req.file.buffer);

    const gatewayHost = process.env.IPFS_HOST || 'localhost';
    const gatewayPort = process.env.IPFS_PORT || '8081';
    const gatewayUrl = `ipfs/${cid}`;
    // Bạn có thể thay gateway này bằng local gateway: http://127.0.0.1:8081/ipfs/${cid}

    // TODO: lưu CID vào smart contract hoặc database nếu muốn
    // await contract.methods.updateEmployeeAvatar(userCode, cid).send({ from: owner });
    await connection
      .promise()
      .query(
        "UPDATE users SET image_url = ? WHERE id = ?",
        [gatewayUrl, userCode]
      );

    res.json({
      cid,
      url: gatewayUrl,
    });
  } catch (err) {
    console.error("❌ IPFS upload error:", err);

    const causeMsg = err && (err.cause && err.cause.code ? err.cause.code : err.message || "");
    if (String(causeMsg).toLowerCase().includes("econnrefused") || String(causeMsg).toLowerCase().includes("connect")) {
      console.error(`IPFS client attempted: ${ipfsUrl}`);
      return res.status(502).json({
        error: `Cannot connect to IPFS API at ${ipfsUrl}. Make sure an IPFS daemon is running and reachable from the server.`,
      });
    }

    res.status(500).json({ error: "Upload to IPFS failed", detail: err.message });
  }
});

/**
 * @swagger
 * /api/employee/{userCode}/status:
 *   put:
 *     summary: Cập nhật trạng thái hoạt động của nhân viên
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: userCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã nhân viên
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [active]
 *             properties:
 *               active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 txHash: { type: string, example: "0xdef456..." }
 *       500:
 *         description: Lỗi khi gửi transaction
 */
employeeRouter.put("/employee/:userCode/status", authenticateToken, async (req, res) => {
  const userData = req.user;
  // Chặn role 3 không được thêm nhân viên
  if (userData.role_id === 3) {
    return res.status(403).json({ message: "Access denied for this role" });
  }

  try {
    const { userCode } = req.params;
    const { active } = req.body;
    const accounts = await web3.eth.getAccounts();
    const owner = accounts[0];

    const receipt = await contract.methods
      .updateEmployeeStatus(userCode, active)
      .send({ from: owner, gas: 2000000 });

    res.json({ txHash: receipt.transactionHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/employee/balance:
 *   post:
 *     summary: Lấy số dư ETH bằng address hoặc privateKey hoặc userCode (body)
 *     tags: [Employee]
 *     responses:
 *       200:
 *         description: Số dư ETH và địa chỉ resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                 address:
 *                   type: string
 *       400:
 *         description: Yêu cầu không hợp lệ (ví dụ address/privateKey không khớp)
 *       404:
 *         description: Không tìm thấy nhân viên (khi userCode không tồn tại)
 *       500:
 *         description: Lỗi server
 */
employeeRouter.post("/employee/balance", authenticateToken, async (req, res) => {
  
  const userData = req.user;
  const wallet_address = userData.wallet_address;
  const private_key = userData.private_key;

  try {
    // If privateKey provided, derive address
    if (private_key) {
      let possiblePk = private_key;
      if (!possiblePk.startsWith("0x")) possiblePk = "0x" + possiblePk;
      try {
        const acct = web3.eth.accounts.privateKeyToAccount(possiblePk);
        const derived = acct.address;
        if (wallet_address && wallet_address.toLowerCase() !== derived.toLowerCase()) {
          return res.status(400).json({ error: "Provided privateKey does not match provided address" });
        }
      } catch (e) {
        return res.status(400).json({ error: "Invalid privateKey" });
      }
    }

    // Query balance by resolved address
    const balanceWei = await web3.eth.getBalance(wallet_address);
    const balanceEth = web3.utils.fromWei(balanceWei, "ether");
    return res.json({ balance: Number(balanceEth), address: wallet_address });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/employee/withdraw:
 *   post:
 *     summary: Employee withdraws ETH by providing privateKey (server signs and sends TX)
 *     tags: [Employee]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userCode, privateKey, amount]
 *             properties:
 *               userCode: { type: string }
 *               privateKey: { type: string }
 *               amount: { type: number, description: 'Amount in ETH' }
 *     responses:
 *       200:
 *         description: Withdraw executed and recorded
 */
employeeRouter.post("/employee/withdraw", async (req, res) => {
  try {
    const { userCode, privateKey, amount } = req.body || {};
    if (!userCode || !privateKey || !amount) return res.status(400).json({ error: "userCode, privateKey, amount required" });

    let pk = privateKey;
    if (!pk.startsWith("0x")) pk = "0x" + pk;

    const acct = web3.eth.accounts.privateKeyToAccount(pk);
    const from = acct.address;

    // Verify that from address matches employee wallet
    const emp = await contract.methods.getEmployee(userCode).call();
    if (!emp || !emp[0]) return res.status(404).json({ error: "Employee not found" });
    const wallet = emp[6];
    if (wallet.toLowerCase() !== from.toLowerCase()) return res.status(400).json({ error: "privateKey does not match employee wallet" });

    // send ETH to owner/collector (accounts[0])
    const accounts = await web3.eth.getAccounts();
    const collector = accounts[0];

    const amountWei = web3.utils.toWei(String(amount), "ether");

    const txCount = await web3.eth.getTransactionCount(from, "pending");

    // Check balance to avoid failing tx (amount + gas)
    const balanceWei = await web3.eth.getBalance(from);
    const gasLimit = 21000;
    const gasPrice = await web3.eth.getGasPrice();
    const totalCost = BigInt(amountWei) + BigInt(gasLimit) * BigInt(gasPrice);
    if (BigInt(balanceWei) < totalCost) {
      return res.status(400).json({ error: "Insufficient funds to cover amount + gas" });
    }

    const chainId = await web3.eth.getChainId();

    // Ensure numeric fields are encoded as proper hex numbers (use BN) to avoid
    // web3 treating decimal strings as raw UTF-8 bytes which produces values like 0x3130...
    const tx = {
      nonce: toHexBn(txCount),
      to: collector,
      value: toHexBn(amountWei),
      gas: toHexBn(gasLimit),
      gasPrice: toHexBn(gasPrice),
      chainId,
    };

    // Use signTransaction helper with the raw private key to ensure proper fields
    let signed, sent;
    try {
      signed = await web3.eth.accounts.signTransaction(tx, pk);
    } catch (signErr) {
      return res.status(500).json(safeJson({ error: `signTransaction failed: ${signErr.message || signErr}`, context: { tx, txCount, balanceWei, gasLimit, gasPrice } }));
    }

    try {
      sent = await web3.eth.sendSignedTransaction(signed.rawTransaction);
    } catch (sendErr) {
      // Surface detailed error info from send failure
      const sendMsg = sendErr && sendErr.message ? sendErr.message : String(sendErr);
      return res.status(500).json(safeJson({ error: `sendSignedTransaction failed: ${sendMsg}`, context: { tx, txCount, signedRawTx: signed.rawTransaction, balanceWei, gasLimit, gasPrice } }));
    }

    // Record withdraw in contract (bookkeeping)
    const owner = accounts[0];

    // Verify that the server account is actually the contract owner (recordWithdraw is onlyOwner)
    const contractOwner = await contract.methods.owner().call();
    if (contractOwner.toLowerCase() !== owner.toLowerCase()) {
      return res.status(400).json({
        error: `Contract owner mismatch: recordWithdraw may only be called by contract owner. Contract owner is ${contractOwner} but server is using ${owner}. Either redeploy contract with the server account as owner or call recordWithdraw from the contract owner account.`
      });
    }

    // Try estimating gas for the recordWithdraw call to catch reverts with reason
    try {
      await contract.methods.recordWithdraw(userCode, amountWei).estimateGas({ from: owner });
    } catch (estErr) {
      // Provide a clearer error back to client with context
      const estMsg = estErr && estErr.message ? estErr.message : String(estErr);
      return res.status(500).json(safeJson({ error: `recordWithdraw estimateGas failed: ${estMsg}`, context: { contractOwner, owner, userCode, wallet, amountWei } }));
    }

    let record;
    try {
      record = await contract.methods.recordWithdraw(userCode, amountWei).send({ from: owner, gas: 200000 });
    } catch (sendErr) {
      const sendMsg = sendErr && sendErr.message ? sendErr.message : String(sendErr);
      // Try to surface nested revert reason if available
      const extra = sendErr && sendErr.cause ? sendErr.cause : undefined;
      return res.status(500).json(safeJson({ error: `recordWithdraw transaction failed: ${sendMsg}`, extra, context: { contractOwner, owner, userCode, wallet, amountWei } }));
    }

    // Compute fiat conversion (default rate 20000 per ETH if not provided via ENV)
    const ratePerEth = Number(process.env.EXCHANGE_RATE) || 20000;
    const fiatValue = Number(amount) * ratePerEth;

    return res.json({
      message: "Withdraw executed",
      amountEth: Number(amount),
      fiatCurrency: "VND",
      ratePerEth,
      fiatValue,
      transferTx: sent.transactionHash,
      recordTx: record.transactionHash,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


/**
 * @swagger
 * /api/employee/{userCode}/logs:
 *   get:
 *     summary: Lấy exchange logs (credits & withdraws) theo userCode
 *     tags: [Employee]
 *     parameters:
 *       - in: path
 *         name: userCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách log
 */
employeeRouter.get("/employee/:userCode/logs", authenticateToken, async (req, res) => {
  try {
    const { userCode } = req.params;

    // Kiểm tra employee tồn tại
    let emp;
    try {
      emp = await contract.methods.getEmployee(userCode).call();
    } catch (empErr) {
      console.error("Error getting employee:", empErr.message);
      return res.status(404).json({ error: "Employee not found or error fetching employee data", detail: empErr.message });
    }

    if (!emp || !emp[0]) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Lấy số lượng log
    let count;
    try {
      count = await contract.methods.getLogCount(userCode).call();
      count = Number(count);
    } catch (countErr) {
      console.error("Error getting log count:", countErr.message);
      return res.status(500).json({ error: "Error fetching log count", detail: countErr.message });
    }

    // Lấy từng log entry
    const logs = [];
    for (let i = 0; i < count; i++) {
      try {
        const l = await contract.methods.getLogByIndex(userCode, i).call();
        const actionType = Number(l[1]);
        let action = 'credit';
        if (actionType === 1) action = 'withdraw';
        else if (actionType === 2) action = 'purchase';
        
        logs.push({
          timestamp: Number(l[0]),
          action,
          amountEth: Number(web3.utils.fromWei(l[2].toString(), "ether"))
        });
      } catch (logErr) {
        console.error(`Error fetching log at index ${i}:`, logErr.message);
        return res.status(500).json({ error: `Error fetching log at index ${i}`, detail: logErr.message });
      }
    }

    // Tính book balance từ logs
    let bookBalanceEth = "0";
    try {
      let totalCredit = 0;
      let totalDebit = 0; // includes both withdrawals and purchases
      
      logs.forEach(log => {
        if (log.action === "credit") {
          totalCredit += log.amountEth;
        } else if (log.action === "withdraw" || log.action === "purchase") {
          totalDebit += log.amountEth;
        }
      });
      
      bookBalanceEth = (totalCredit - totalDebit).toString();
    } catch (calcErr) {
      console.error("Error calculating book balance:", calcErr.message);
      bookBalanceEth = "0";
    }

    return res.json({
      userCode,
      logs,
      bookBalance: Number(bookBalanceEth),
      logCount: logs.length
    });
  } catch (err) {
    console.error("Unexpected error in /logs endpoint:", err);
    return res.status(500).json({
      error: "Error happened while trying to execute a function inside a smart contract",
      detail: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Quick endpoint to inspect contract owner vs server account
employeeRouter.get('/employee/contract-owner', async (req, res) => {
  try {
    const onChainOwner = await contract.methods.owner().call();
    const accounts = await web3.eth.getAccounts();
    const serverAccount = accounts[0];
    return res.json({ contractOwner: onChainOwner, serverAccount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
export default employeeRouter;