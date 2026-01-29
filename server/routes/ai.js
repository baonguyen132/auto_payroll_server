import express from 'express';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { generateImage } from '../ai/generateImage.js';


const aiRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: AI
 *     description: API for managing AI-related tasks
 */

/**
 * @swagger
 * /api/generate-image:
 *   post:
 *     summary: AI endpoint to generate image
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: "banana"
 *     responses:
 *       200:
 *         description: Text generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 iduser:
 *                   type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

aiRouter.post("/generate-image", authenticateToken, async (req, res) => {
  const accessToken = req.accessToken;
  const prompt = req.body.prompt;

  console.log(accessToken , prompt);
  

  try {
    const pathImage = await generateImage(prompt);
    res.status(200).json({ message: "Text generated successfully", iduser: req.user.id , pathImage});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default aiRouter;
