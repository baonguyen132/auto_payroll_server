import express from 'express';
import multer from 'multer';
import { addProduct, updateProduct, listProducts, buyProducts, deleteProduct } from '../controllers/product.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product management and purchase
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Add a new product (automatically uses image from assets/images folder)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [productCode, name, priceEther]
 *             properties:
 *               productCode:
 *                 type: string
 *                 description: Unique product code
 *               name:
 *                 type: string
 *                 description: Product name
 *               priceEther:
 *                 type: string
 *                 description: Price in ETH
 *     responses:
 *       200:
 *         description: Product added successfully (image automatically taken from assets/images folder and uploaded to IPFS)
 */
router.post('/products', upload.single('imageFile'), addProduct);

/**
 * @swagger
 * /api/products/{code}:
 *   put:
 *     tags: [Products]
 *     summary: Update an existing product
 *     parameters:
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Product code
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               priceEther:
 *                 type: string
 *               imageFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put('/products/:productCode', upload.single('imageFile'), updateProduct);

/**
 * @swagger
 * /api/products/{code}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product by product code
 *     parameters:
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Product code
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       403:
 *         description: Not authorized (must be contract owner)
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal error
 */
router.delete('/products/:productCode', deleteProduct);

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List all products
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/products', listProducts);

/**
 * @swagger
 * /api/products/buy:
 *   post:
 *     tags: [Products]
 *     summary: Buy product(s) - single or multiple products with quantities (and log to employee record)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userCode, buyerPrivateKey, products]
 *             properties:
 *               userCode:
 *                 type: string
 *                 description: Employee user code (for purchase logging)
 *               buyerPrivateKey:
 *                 type: string
 *                 description: Buyer's private key for signing transaction
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productCode:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       example: 1
 *             example:
 *               userCode: "EMP001"
 *               buyerPrivateKey: "0xabc123..."
 *               products:
 *                 - productCode: "PRD1"
 *                   quantity: 2
 *     responses:
 *       200:
 *         description: Purchase completed and logged to employee record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionHash:
 *                       type: string
 *                     products:
 *                       type: array
 *                     totalPriceEth:
 *                       type: string
 */
router.post('/products/buy', buyProducts);

export default router;