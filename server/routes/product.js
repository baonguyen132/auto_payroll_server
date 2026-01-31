import express from 'express';
import multer from 'multer';
import { addProduct, updateProduct, listProducts, buyProducts, deleteProduct } from '../controllers/product.controller.js';

const router = express.Router();

// Configure multer with file size limits and file type validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product management and purchase operations
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List all active products
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   productCode:
 *                     type: string
 *                     example: "PRD1"
 *                   name:
 *                     type: string
 *                     example: "Product Name"
 *                   priceWei:
 *                     type: string
 *                     example: "1000000000000000000"
 *                   image:
 *                     type: string
 *                     example: "QmHash..."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.get('/products', listProducts);

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
 *                 example: "PRD1"
 *               name:
 *                 type: string
 *                 description: Product name
 *                 example: "Product Name"
 *               priceEther:
 *                 type: string
 *                 description: Price in ETH
 *                 example: "1.5"
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: Optional image file (if not provided, uses first image from assets/images folder)
 *     responses:
 *       200:
 *         description: Product added successfully (image automatically taken from assets/images folder and uploaded to IPFS)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionHash:
 *                       type: string
 *                       example: "0xabc123..."
 *                     blockNumber:
 *                       type: string
 *                       nullable: true
 *                     gasUsed:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: boolean
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Forbidden - not contract owner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.post('/products', upload.single('imageFile'), addProduct);

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
 *                 example: "EMP001"
 *               buyerPrivateKey:
 *                 type: string
 *                 description: Buyer's private key for signing transaction
 *                 example: "0xabc123..."
 *               products:
 *                 type: array
 *                 description: Array of products to purchase
 *                 items:
 *                   type: object
 *                   required: [productCode, quantity]
 *                   properties:
 *                     productCode:
 *                       type: string
 *                       example: "PRD1"
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *                       example: 2
 *             example:
 *               userCode: "EMP001"
 *               buyerPrivateKey: "0xabc123..."
 *               products:
 *                 - productCode: "PRD1"
 *                   quantity: 2
 *                 - productCode: "PRD2"
 *                   quantity: 1
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
 *                   example: "Product(s) purchased successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionHash:
 *                       type: string
 *                       example: "0xdef456..."
 *                     blockNumber:
 *                       type: string
 *                       nullable: true
 *                     gasUsed:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: boolean
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalPriceWei:
 *                       type: string
 *                     totalPriceEth:
 *                       type: string
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.post('/products/buy', buyProducts);

/**
 * @swagger
 * /api/products/{productCode}:
 *   put:
 *     tags: [Products]
 *     summary: Update an existing product
 *     parameters:
 *       - in: path
 *         name: productCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Product code to update
 *         example: "PRD1"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated product name
 *                 example: "Updated Product Name"
 *               priceEther:
 *                 type: string
 *                 description: Updated price in ETH
 *                 example: "2.0"
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: Optional new image file
 *               imageBase64:
 *                 type: string
 *                 description: Optional base64 encoded image (alternative to imageFile)
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionHash:
 *                       type: string
 *                     blockNumber:
 *                       type: string
 *                       nullable: true
 *                     gasUsed:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: boolean
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Forbidden - not contract owner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.put('/products/:productCode', upload.single('imageFile'), updateProduct);

/**
 * @swagger
 * /api/products/{productCode}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product by product code
 *     parameters:
 *       - in: path
 *         name: productCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Product code to delete
 *         example: "PRD1"
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionHash:
 *                       type: string
 *                     blockNumber:
 *                       type: string
 *                       nullable: true
 *                     gasUsed:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: boolean
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized (must be contract owner)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.delete('/products/:productCode', deleteProduct);

export default router;