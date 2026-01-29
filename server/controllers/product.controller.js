import { productContract, web3, employeeContract } from '../blockchain/contractInstance.js';
import ipfs from '../blockchain/ipfsClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to safely serialize values (convert BigInt, BN to strings)
function toJSON(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') return value.toString();
    if (value && typeof value === 'object' && value.toString().includes('BN')) return value.toString();
    return value;
  }));
}

async function addProduct(req, res) {
  try {
    // Expect multipart/form-data with fields
    const { productCode, name, priceEther } = req.body;
    
    // Validate inputs
    if (!productCode || String(productCode).trim() === '') return res.status(400).json({ message: 'productCode is required' });
    if (!name || String(name).trim() === '') return res.status(400).json({ message: 'name is required' });
    if (!priceEther && priceEther !== 0) return res.status(400).json({ message: 'priceEther is required' });
    
    // Normalize productCode (accept both '1' and 'PRD1' formats)
    const normalizedCode = String(productCode).trim();
    const normalizedName = String(name).trim();
    
    // Validate price is a valid number
    const priceNum = parseFloat(String(priceEther));
    if (isNaN(priceNum) || priceNum < 0) return res.status(400).json({ message: 'priceEther must be a valid positive number' });

    let imageHash = '';

    // Read image from assets/images folder
    const assetsDir = path.resolve(__dirname, '../assets/images');
    const imageFiles = fs.readdirSync(assetsDir).filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    
    if (imageFiles.length === 0) {
      return res.status(400).json({ message: 'No image found in assets/images folder' });
    }

    // Use the first (and only) image file
    const imagePath = path.join(assetsDir, imageFiles[0]);
    console.log(`Using image from: ${imagePath}`);
    
    const imageBuffer = fs.readFileSync(imagePath);
    const added = await ipfs.add(imageBuffer);
    imageHash = added.path || (added.cid && added.cid.toString()) || '';
    console.log(`Image uploaded to IPFS with hash: ${imageHash}`);

    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];

    // verify admin is contract owner to avoid silent revert
    try {
      const ownerAddr = await productContract.methods.owner().call();
      if (ownerAddr && ownerAddr.toLowerCase() !== admin.toLowerCase()) {
        return res.status(403).json({ message: 'Admin account is not contract owner', owner: ownerAddr, admin });
      }
    } catch (e) {
      // if owner() call fails, include warning but continue to allow the subsequent call to surface the real error
      console.warn('Warning: could not read owner from ProductContract', e.message || e);
    }
    
    const priceWei = web3.utils.toWei(String(priceNum), 'ether');

    const gas = 3000000;
    const tx = await productContract.methods.addProduct(normalizedCode, normalizedName, priceWei, imageHash).send({ from: admin, gas });
    
    // Sanitize transaction object before returning
    const result = {
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber != null ? String(tx.blockNumber) : null,
      gasUsed: tx.gasUsed != null ? String(tx.gasUsed) : null,
      status: tx.status ?? true,
    };
    
    return res.json({ message: 'Product added successfully', data: toJSON(result) });
  } catch (err) {
    console.error('Error in addProduct:', err);
    const reason = extractErrorReason(err);
    return res.status(500).json({ message: 'Internal error', error: reason });
  }
}

async function updateProduct(req, res) {
  try {
    const { productCode } = req.params;
    const { name, priceEther, imageBase64 } = req.body;
    
    // Validate inputs
    if (!productCode || String(productCode).trim() === '') return res.status(400).json({ message: 'productCode is required' });
    if (!name || String(name).trim() === '') return res.status(400).json({ message: 'name is required' });
    if (!priceEther && priceEther !== 0) return res.status(400).json({ message: 'priceEther is required' });
    
    // Normalize values
    const normalizedCode = String(productCode).trim();
    const normalizedName = String(name).trim();
    
    // Validate price is a valid number
    const priceNum = parseFloat(String(priceEther));
    if (isNaN(priceNum) || priceNum < 0) return res.status(400).json({ message: 'priceEther must be a valid positive number' });

    let imageHash = '';
    if (req.file && req.file.buffer) {
      const added = await ipfs.add(req.file.buffer);
      imageHash = added.path || (added.cid && added.cid.toString()) || '';
    } else if (imageBase64) {
      const buffer = Buffer.from(imageBase64, 'base64');
      const added = await ipfs.add(buffer);
      imageHash = added.path || (added.cid && added.cid.toString()) || '';
    }

    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];

    // verify admin is contract owner to avoid silent revert
    try {
      const ownerAddr = await productContract.methods.owner().call();
      if (ownerAddr && ownerAddr.toLowerCase() !== admin.toLowerCase()) {
        return res.status(403).json({ message: 'Admin account is not contract owner', owner: ownerAddr, admin });
      }
    } catch (e) {
      console.warn('Warning: could not read owner from ProductContract', e.message || e);
    }
    
    const priceWei = web3.utils.toWei(String(priceNum), 'ether');

    const gas = 3000000;
    const tx = await productContract.methods.updateProduct(normalizedCode, normalizedName, priceWei, imageHash).send({ from: admin, gas });
    
    // Sanitize transaction object before returning
    const result = {
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber != null ? String(tx.blockNumber) : null,
      gasUsed: tx.gasUsed != null ? String(tx.gasUsed) : null,
      status: tx.status ?? true,
    };
    
    return res.json({ message: 'Product updated successfully', data: toJSON(result) });
  } catch (err) {
    console.error('Error in updateProduct:', err);
    const reason = extractErrorReason(err);
    return res.status(500).json({ message: 'Internal error', error: reason });
  }
}

async function listProducts(req, res) {
  try {
    const list = await productContract.methods.getAllProducts().call();
    // map product tuple to object and safely serialize BigInt values
    // filter out deleted products (exists = false)
    const mapped = list
      .filter(p => p.exists === true)
      .map((p) => ({
        productCode: p.productCode,
        name: p.name,
        priceWei: String(p.price), // Convert BigInt to string
        image: p.image
      }));
    return res.json(toJSON(mapped));
  } catch (err) {
    console.error('Error in listProducts:', err);
    const reason = extractErrorReason(err);
    return res.status(500).json({ message: 'Internal error', error: reason });
  }
}

async function buyProducts(req, res) {
  try {
    const { userCode, buyerPrivateKey, products } = req.body;

    // Validate inputs
    if (!userCode || String(userCode).trim() === '') return res.status(400).json({ message: 'userCode is required' });
    if (!buyerPrivateKey || String(buyerPrivateKey).trim() === '') return res.status(400).json({ message: 'buyerPrivateKey is required' });
    if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ message: 'products array is required and must not be empty' });

    // Validate and normalize products
    const normalizedProducts = [];
    let totalPriceWei = BigInt(0);

    for (const prod of products) {
      if (!prod.productCode || String(prod.productCode).trim() === '') return res.status(400).json({ message: 'productCode is required for each product' });
      if (!prod.quantity || prod.quantity <= 0) return res.status(400).json({ message: 'quantity must be a positive number for each product' });

      const normalizedCode = String(prod.productCode).trim();
      const qty = Number(prod.quantity);

      // Fetch product to get price
      try {
        const prodData = await productContract.methods.getProduct(normalizedCode).call();
        const priceWei = BigInt(prodData[2]);
        const itemTotalWei = priceWei * BigInt(qty);
        totalPriceWei += itemTotalWei;
        normalizedProducts.push({ productCode: normalizedCode, quantity: qty, priceWei: priceWei.toString(), itemTotalWei: itemTotalWei.toString() });
      } catch (err) {
        return res.status(404).json({ message: `Product ${normalizedCode} not found` });
      }
    }

    // Prepare buyer account
    const pkeyStr = String(buyerPrivateKey).trim();
    const fullKey = pkeyStr.startsWith('0x') ? pkeyStr : '0x' + pkeyStr;
    const account = web3.eth.accounts.privateKeyToAccount(fullKey);
    const from = account.address;

    // Build product codes and quantities arrays for buyProducts call
    const codes = normalizedProducts.map(p => p.productCode);
    const quantities = normalizedProducts.map(p => p.quantity);

    const txData = productContract.methods.buyProducts(codes, quantities).encodeABI();

    // Estimate gas and get gas price
    const gasEstimate = await web3.eth.estimateGas({ to: productContract.options.address, data: txData, value: String(totalPriceWei), from });
    const gasLimit = Math.floor(Number(gasEstimate) * 1.2) + 10000;
    const gasPrice = await web3.eth.getGasPrice();

    const tx = {
      from,
      to: productContract.options.address,
      data: txData,
      value: String(totalPriceWei),
      gas: gasLimit,
      gasPrice,
    };

    const signed = await account.signTransaction(tx);
    if (!signed || !signed.rawTransaction) throw new Error('Failed to sign transaction');
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

    // Record purchase in EmployeeContract logs
    try {
      const accounts = await web3.eth.getAccounts();
      const admin = accounts[0];
      
      // Verify admin is contract owner
      const empOwner = await employeeContract.methods.owner().call();
      if (empOwner && empOwner.toLowerCase() === admin.toLowerCase()) {
        await employeeContract.methods.recordPurchase(userCode, String(totalPriceWei)).send({ from: admin, gas: 300000 });
      }
    } catch (logErr) {
      console.warn('Warning: could not record purchase in EmployeeContract:', logErr.message || logErr);
      // Continue even if logging fails - the purchase was already successful
    }

    // Sanitize receipt object before returning
    const result = {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber != null ? String(receipt.blockNumber) : null,
      gasUsed: receipt.gasUsed != null ? String(receipt.gasUsed) : null,
      status: receipt.status ?? true,
      products: normalizedProducts,
      totalPriceWei: String(totalPriceWei),
      totalPriceEth: web3.utils.fromWei(String(totalPriceWei), 'ether'),
    };

    return res.json({ message: 'Product(s) purchased successfully', data: toJSON(result) });
  } catch (err) {
    console.error('Error in buyProducts:', err);
    const reason = extractErrorReason(err);
    return res.status(500).json({ message: 'Internal error', error: reason });
  }
}

function extractErrorReason(err) {
  try {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    // web3 provider error messages often contain 'revert' with the reason
    if (err.message) {
      // prefer explicit revert reason
      const m = String(err.message);
      const idx = m.indexOf('revert');
      if (idx >= 0) return m.substring(idx);
      return m;
    }
    if (err.data) return JSON.stringify(err.data);
    return JSON.stringify(err);
  } catch (e) {
    return String(err);
  }
}

async function deleteProduct(req, res) {
  try {
    const { productCode } = req.params;
    
    // Validate inputs
    if (!productCode || String(productCode).trim() === '') return res.status(400).json({ message: 'productCode is required' });

    const normalizedCode = String(productCode).trim();

    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0];

    // verify admin is contract owner to avoid silent revert
    try {
      const ownerAddr = await productContract.methods.owner().call();
      if (ownerAddr && ownerAddr.toLowerCase() !== admin.toLowerCase()) {
        return res.status(403).json({ message: 'Admin account is not contract owner', owner: ownerAddr, admin });
      }
    } catch (e) {
      console.warn('Warning: could not read owner from ProductContract', e.message || e);
    }

    const gas = 300000;
    const tx = await productContract.methods.deleteProduct(normalizedCode).send({ from: admin, gas });
    
    // Sanitize transaction object before returning
    const result = {
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber != null ? String(tx.blockNumber) : null,
      gasUsed: tx.gasUsed != null ? String(tx.gasUsed) : null,
      status: tx.status ?? true,
    };
    
    return res.json({ message: 'Product deleted successfully', data: toJSON(result) });
  } catch (err) {
    console.error('Error in deleteProduct:', err);
    const reason = extractErrorReason(err);
    return res.status(500).json({ message: 'Internal error', error: reason });
  }
}

export { addProduct, updateProduct, listProducts, buyProducts, deleteProduct };