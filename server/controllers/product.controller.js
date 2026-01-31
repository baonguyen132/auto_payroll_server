import { productContract, web3, employeeContract } from '../blockchain/contractInstance.js';
import ipfs from '../blockchain/ipfsClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const GAS_LIMITS = {
  ADD_PRODUCT: 3000000,
  UPDATE_PRODUCT: 3000000,
  DELETE_PRODUCT: 300000,
  RECORD_PURCHASE: 300000,
};

const ASSETS_DIR = path.resolve(__dirname, '../assets/images');
const DEFAULT_IMAGE_FILE = 'generated.png';
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)$/i;

// Helper to safely serialize values (convert BigInt, BN to strings)
function toJSON(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') return value.toString();
    if (value && typeof value === 'object' && value.toString().includes('BN')) return value.toString();
    return value;
  }));
}

// Validation helpers
function validateRequired(value, fieldName) {
  if (!value || String(value).trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

function validateProductCode(productCode) {
  const validation = validateRequired(productCode, 'productCode');
  if (!validation.valid) return validation;
  return { valid: true, normalized: String(productCode).trim() };
}

function validateProductName(name) {
  const validation = validateRequired(name, 'name');
  if (!validation.valid) return validation;
  return { valid: true, normalized: String(name).trim() };
}

function validatePrice(priceEther) {
  if (priceEther === null || priceEther === undefined || priceEther === '') {
    return { valid: false, error: 'priceEther is required' };
  }
  const priceNum = parseFloat(String(priceEther));
  if (isNaN(priceNum) || priceNum < 0) {
    return { valid: false, error: 'priceEther must be a valid positive number' };
  }
  return { valid: true, normalized: priceNum };
}

// Helper to sanitize transaction response
function sanitizeTransaction(tx) {
  return {
    transactionHash: tx.transactionHash,
    blockNumber: tx.blockNumber != null ? String(tx.blockNumber) : null,
    gasUsed: tx.gasUsed != null ? String(tx.gasUsed) : null,
    status: tx.status ?? true,
  };
}

// Helper to verify contract owner
async function verifyContractOwner(contract, adminAddress) {
  try {
    const ownerAddr = await contract.methods.owner().call();
    if (ownerAddr && ownerAddr.toLowerCase() !== adminAddress.toLowerCase()) {
      return { 
        isOwner: false, 
        error: { message: 'Admin account is not contract owner', owner: ownerAddr, admin: adminAddress } 
      };
    }
    return { isOwner: true };
  } catch (e) {
    console.warn('Warning: could not read owner from contract', e.message || e);
    return { isOwner: true }; // Continue to allow subsequent call to surface the real error
  }
}

// Helper to upload image to IPFS
async function uploadImageToIPFS(imageBuffer) {
  try {
    const added = await ipfs.add(imageBuffer);
    return added.path || (added.cid && added.cid.toString()) || '';
  } catch (err) {
    console.error('Error uploading image to IPFS:', err);
    throw new Error(`Failed to upload image to IPFS: ${err.message || err}`);
  }
}

// Helper to get image from assets folder or uploaded file
async function getImageHash(req) {
  // Priority 1: Use uploaded file from multer
  if (req.file && req.file.buffer) {
    return await uploadImageToIPFS(req.file.buffer);
  }

  // Priority 2: Use base64 image from request body
  if (req.body.imageBase64) {
    try {
      const buffer = Buffer.from(req.body.imageBase64, 'base64');
      return await uploadImageToIPFS(buffer);
    } catch (err) {
      throw new Error(`Invalid base64 image: ${err.message || err}`);
    }
  }

  // Priority 3: Fallback to generated.png in assets/images folder
  try {
    if (!fs.existsSync(ASSETS_DIR)) {
      throw new Error('Assets directory does not exist');
    }

    const imagePath = path.join(ASSETS_DIR, DEFAULT_IMAGE_FILE);
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Default image file ${DEFAULT_IMAGE_FILE} not found in assets/images folder`);
    }

    console.log(`Using default image from: ${imagePath}`);
    
    const imageBuffer = fs.readFileSync(imagePath);
    const hash = await uploadImageToIPFS(imageBuffer);
    console.log(`Image uploaded to IPFS with hash: ${hash}`);
    return hash;
  } catch (err) {
    throw new Error(`Failed to get image: ${err.message || err}`);
  }
}

// Helper to get admin account
async function getAdminAccount() {
  const accounts = await web3.eth.getAccounts();
  return accounts[0];
}

async function addProduct(req, res) {
  try {
    const { productCode, name, priceEther } = req.body;
    
    // Validate inputs
    const codeValidation = validateProductCode(productCode);
    if (!codeValidation.valid) {
      return res.status(400).json({ message: codeValidation.error });
    }

    const nameValidation = validateProductName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: nameValidation.error });
    }

    const priceValidation = validatePrice(priceEther);
    if (!priceValidation.valid) {
      return res.status(400).json({ message: priceValidation.error });
    }

    const normalizedCode = codeValidation.normalized;
    const normalizedName = nameValidation.normalized;
    const priceNum = priceValidation.normalized;

    // Get image hash (from upload, base64, or assets folder)
    let imageHash = '';
    try {
      imageHash = await getImageHash(req);
    } catch (imageErr) {
      return res.status(400).json({ message: imageErr.message || 'Failed to process image' });
    }

    // Get admin account and verify ownership
    const admin = await getAdminAccount();
    const ownerCheck = await verifyContractOwner(productContract, admin);
    if (!ownerCheck.isOwner) {
      return res.status(403).json(ownerCheck.error);
    }
    
    // Convert price to Wei and send transaction
    const priceWei = web3.utils.toWei(String(priceNum), 'ether');
    const tx = await productContract.methods
      .addProduct(normalizedCode, normalizedName, priceWei, imageHash)
      .send({ from: admin, gas: GAS_LIMITS.ADD_PRODUCT });
    
    return res.json({ 
      message: 'Product added successfully', 
      data: toJSON(sanitizeTransaction(tx)) 
    });
  } catch (err) {
    console.error('Error in addProduct:', err);
    const reason = extractErrorReason(err);
    return res.status(500).json({ message: 'Internal error', error: reason });
  }
}

async function updateProduct(req, res) {
  try {
    const { productCode } = req.params;
    const { name, priceEther } = req.body;
    
    // Validate inputs
    const codeValidation = validateProductCode(productCode);
    if (!codeValidation.valid) {
      return res.status(400).json({ message: codeValidation.error });
    }

    const nameValidation = validateProductName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: nameValidation.error });
    }

    const priceValidation = validatePrice(priceEther);
    if (!priceValidation.valid) {
      return res.status(400).json({ message: priceValidation.error });
    }

    const normalizedCode = codeValidation.normalized;
    const normalizedName = nameValidation.normalized;
    const priceNum = priceValidation.normalized;

    // Get image hash (optional for update - only if provided)
    let imageHash = '';
    if (req.file || req.body.imageBase64) {
      try {
        imageHash = await getImageHash(req);
      } catch (imageErr) {
        return res.status(400).json({ message: imageErr.message || 'Failed to process image' });
      }
    }

    // Get admin account and verify ownership
    const admin = await getAdminAccount();
    const ownerCheck = await verifyContractOwner(productContract, admin);
    if (!ownerCheck.isOwner) {
      return res.status(403).json(ownerCheck.error);
    }
    
    // Convert price to Wei and send transaction
    const priceWei = web3.utils.toWei(String(priceNum), 'ether');
    const tx = await productContract.methods
      .updateProduct(normalizedCode, normalizedName, priceWei, imageHash)
      .send({ from: admin, gas: GAS_LIMITS.UPDATE_PRODUCT });
    
    return res.json({ 
      message: 'Product updated successfully', 
      data: toJSON(sanitizeTransaction(tx)) 
    });
  } catch (err) {
    console.error('Error in updateProduct:', err);
    const reason = extractErrorReason(err);
    return res.status(500).json({ message: 'Internal error', error: reason });
  }
}

async function listProducts(req, res) {
  try {
    const list = await productContract.methods.getAllProducts().call();
    
    // Filter out deleted products and map to response format
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
    const userCodeValidation = validateRequired(userCode, 'userCode');
    if (!userCodeValidation.valid) {
      return res.status(400).json({ message: userCodeValidation.error });
    }

    const privateKeyValidation = validateRequired(buyerPrivateKey, 'buyerPrivateKey');
    if (!privateKeyValidation.valid) {
      return res.status(400).json({ message: privateKeyValidation.error });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'products array is required and must not be empty' });
    }

    // Validate and normalize products, calculate total price
    const normalizedProducts = [];
    let totalPriceWei = BigInt(0);

    for (const prod of products) {
      const codeValidation = validateProductCode(prod.productCode);
      if (!codeValidation.valid) {
        return res.status(400).json({ message: codeValidation.error + ' for each product' });
      }

      const qty = Number(prod.quantity);
      if (!prod.quantity || qty <= 0 || !Number.isInteger(qty)) {
        return res.status(400).json({ message: 'quantity must be a positive integer for each product' });
      }

      const normalizedCode = codeValidation.normalized;

      // Fetch product to get price
      try {
        const prodData = await productContract.methods.getProduct(normalizedCode).call();
        if (!prodData || !prodData[0]) {
          return res.status(404).json({ message: `Product ${normalizedCode} not found` });
        }
        
        const priceWei = BigInt(prodData[2]);
        const itemTotalWei = priceWei * BigInt(qty);
        totalPriceWei += itemTotalWei;
        
        normalizedProducts.push({ 
          productCode: normalizedCode, 
          quantity: qty, 
          priceWei: priceWei.toString(), 
          itemTotalWei: itemTotalWei.toString() 
        });
      } catch (err) {
        return res.status(404).json({ message: `Product ${normalizedCode} not found` });
      }
    }

    // Prepare buyer account from private key
    const pkeyStr = String(buyerPrivateKey).trim();
    const fullKey = pkeyStr.startsWith('0x') ? pkeyStr : '0x' + pkeyStr;
    
    let account, from;
    try {
      account = web3.eth.accounts.privateKeyToAccount(fullKey);
      from = account.address;
    } catch (err) {
      return res.status(400).json({ message: 'Invalid private key format' });
    }

    // Build transaction data
    const codes = normalizedProducts.map(p => p.productCode);
    const quantities = normalizedProducts.map(p => p.quantity);
    const txData = productContract.methods.buyProducts(codes, quantities).encodeABI();

    // Estimate gas and prepare transaction
    const gasEstimate = await web3.eth.estimateGas({ 
      to: productContract.options.address, 
      data: txData, 
      value: String(totalPriceWei), 
      from 
    });
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

    // Sign and send transaction
    const signed = await account.signTransaction(tx);
    if (!signed || !signed.rawTransaction) {
      throw new Error('Failed to sign transaction');
    }
    
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

    // Record purchase in EmployeeContract logs (non-blocking)
    try {
      const admin = await getAdminAccount();
      const ownerCheck = await verifyContractOwner(employeeContract, admin);
      
      if (ownerCheck.isOwner) {
        await employeeContract.methods
          .recordPurchase(String(userCode).trim(), String(totalPriceWei))
          .send({ from: admin, gas: GAS_LIMITS.RECORD_PURCHASE });
      }
    } catch (logErr) {
      console.warn('Warning: could not record purchase in EmployeeContract:', logErr.message || logErr);
      // Continue even if logging fails - the purchase was already successful
    }

    // Prepare response
    const result = {
      ...sanitizeTransaction(receipt),
      products: normalizedProducts,
      totalPriceWei: String(totalPriceWei),
      totalPriceEth: web3.utils.fromWei(String(totalPriceWei), 'ether'),
    };

    return res.json({ 
      message: 'Product(s) purchased successfully', 
      data: toJSON(result) 
    });
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
    const codeValidation = validateProductCode(productCode);
    if (!codeValidation.valid) {
      return res.status(400).json({ message: codeValidation.error });
    }

    const normalizedCode = codeValidation.normalized;

    // Get admin account and verify ownership
    const admin = await getAdminAccount();
    const ownerCheck = await verifyContractOwner(productContract, admin);
    if (!ownerCheck.isOwner) {
      return res.status(403).json(ownerCheck.error);
    }

    // Delete product
    const tx = await productContract.methods
      .deleteProduct(normalizedCode)
      .send({ from: admin, gas: GAS_LIMITS.DELETE_PRODUCT });
    
    return res.json({ 
      message: 'Product deleted successfully', 
      data: toJSON(sanitizeTransaction(tx)) 
    });
  } catch (err) {
    console.error('Error in deleteProduct:', err);
    const reason = extractErrorReason(err);
    return res.status(500).json({ message: 'Internal error', error: reason });
  }
}

export { addProduct, updateProduct, listProducts, buyProducts, deleteProduct };