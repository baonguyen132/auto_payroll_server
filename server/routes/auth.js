import express, { json } from "express";
import connection from "../services/connectDatabase.js";
import { generateAccessToken } from "../utils/token.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const authRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: API for user authentication
 */

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "username123"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: "username123"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     wallet_address:
 *                       type: string
 *                       example: "0xABCDEF1234567890"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid username or password"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
authRouter.post("/login", loginLimiter, async (req, res) => {
    // Logic for user login
    const data = JSON.parse(JSON.stringify(req.body));
    const username = data["username"];
    const password = data["password"];

    const query = "SELECT * FROM users WHERE username = ? AND password = ?";
    connection.query(query, [username, password], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (results[0].status === 0) {
            return res.status(403).json({ message: "Account is inactive. Please contact admin." });
        }
        
        const user = results[0];
        const token = generateAccessToken(user);
        return res.status(200).json({ token , user });
    });
});

export default authRouter;