import express, { json } from 'express';
import connection from '../services/connectDatabase.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const cardsRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Cards
 *     description: API for managing cards
 */

/**
 * @swagger
 * /api/cards:
 *   post:
 *     summary: Cards endpoint to receive and log data
 *     tags: [Cards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: The code to be tested
 *                 example: "HH II XX UU"
 *     responses:
 *       200:
 *         description: Cards endpoint successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Card received successfully"
 *                 code:
 *                   type: string
 *                   description: The code that was sent
 *                   example: "HH II XX UU"
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

cardsRouter.post("/cards", async (req, res) => {
    console.log("✅ Cards endpoint hit");
    const data = JSON.parse(JSON.stringify(req.body));

    const codeCard = data["code"].replace(/\s/g, "").trim();
    connection.query('INSERT INTO cards (card_uid,user_id,is_active,issued_at,deactivated_at,updated_at) VALUES (?,?,?,?,?,?)', [codeCard, null, 1, new Date(), null, new Date()], (err, results) => {
        if (err) {
            console.error('Error inserting card into database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    });
    res.status(200).json({ message: "Successfully", code: codeCard });
});


/**
 * @swagger
 * /api/cards:
 *   get:
 *     summary: Cards endpoint to retrieve all cards
 *     tags: [Cards]
 *     responses:
 *       200:
 *         description: Cards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   card_uid:
 *                     type: string
 *                     example: "AA AA AA AA"
 *                   user_id:
 *                     type: integer
 *                     example: 1
 *                   is_active:
 *                     type: boolean
 *                     example: true
 *                   issued_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-01-01T00:00:00.000Z"
 *                   deactivated_at:
 *                     type: string
 *                     format: date-time
 *                     example: null
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-01-01T00:00:00.000Z"
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

cardsRouter.get("/cards", authenticateToken, async (req, res) => {
    console.log("✅ Get Cards endpoint hit");

    const userData = req.user;
    
    if(userData.role_id == 3){
        return res.status(403).json({ message: "Access denied for this role" });
    }

    connection.query('SELECT * FROM cards', (err, results) => {
        if (err) {
            console.error('Error fetching cards from database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json({ message: "Cards fetched successfully", cards: results });
    });
});
/**
 * @swagger
 * /api/cards/{user_id}:
 *   get:
 *     summary: Cards endpoint to retrieve all cards for a specific user
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         description: The ID of the user to retrieve cards for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   card_uid:
 *                     type: string
 *                     example: "AA AA AA AA"
 *                   user_id:
 *                     type: integer
 *                     example: 1
 *                   is_active:
 *                     type: boolean
 *                     example: true
 *                   issued_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-01-01T00:00:00.000Z"
 *                   deactivated_at:
 *                     type: string
 *                     format: date-time
 *                     example: null
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-01-01T00:00:00.000Z"
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
cardsRouter.get("/cards/:user_id", authenticateToken, async (req, res) => {
    console.log("✅ Get Cards by User ID endpoint hit");

    const userData = req.user;
    
    if(userData.role_id == 3){
        return res.status(403).json({ message: "Access denied for this role" });
    }

    const userId = req.params.user_id;

    if (userId == 0) {
        connection.query('SELECT * FROM cards WHERE user_id IS NULL', (err, results) => {
            if (err) {
                console.error('Error fetching cards from database:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }
            res.status(200).json({ message: "Cards fetched successfully", cards: results });
        });
    }
    else {
        connection.query('SELECT * FROM cards WHERE user_id = ?', [userId], (err, results) => {
            if (err) {
                console.error('Error fetching cards from database:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }
            res.status(200).json({ message: "Cards fetched successfully", cards: results });
        });
    }
});

/**
 * @swagger
 * /api/cards/user_id:
 *   get:
 *     summary: Cards endpoint to retrieve all cards for a specific user
 *     tags: [Cards]
 *     responses:
 *       200:
 *         description: Cards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   card_uid:
 *                     type: string
 *                     example: "AA AA AA AA"
 *                   user_id:
 *                     type: integer
 *                     example: 1
 *                   is_active:
 *                     type: boolean
 *                     example: true
 *                   issued_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-01-01T00:00:00.000Z"
 *                   deactivated_at:
 *                     type: string
 *                     format: date-time
 *                     example: null
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-01-01T00:00:00.000Z"
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
cardsRouter.get("/cards/user_id", authenticateToken, async (req, res) => {
    console.log("✅ Get All Cards endpoint hit");

    const userData = req.user;

    if (userData.role_id == 3) {
        return res.status(403).json({ message: "Access denied for this role" });
    }

    connection.query('SELECT * FROM cards WHERE user_id IS NOT NULL', (err, results) => {
        if (err) {
            console.error('Error fetching cards from database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json({ message: "Cards fetched successfully", cards: results });
    });
});

/**
 * @swagger
 * /api/cards:
 *   delete:
 *     summary: Delete a card by ID
 *     tags: [Cards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: int
 *                 description: The ID of the card to be deleted
 *                 example: 1
 *     responses:
 *       200:
 *         description: Card deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Card deleted successfully"
 *                 id:
 *                   type: int
 *                   description: The ID of the card that was deleted
 *                   example: 1
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
cardsRouter.delete("/cards", authenticateToken, async (req, res) => {
    console.log("✅ Delete Cards endpoint hit");

    const userData = req.user;
    
    if (userData.role_id == 3) {
        return res.status(403).json({ message: "Access denied for this role" });
    }

    const data = JSON.parse(JSON.stringify(req.body));
    const cardId = data["id"]; // Get the card ID from the request body

    connection.query('DELETE FROM cards WHERE id = ?', [cardId], (err, results) => {
        if (err) {
            console.error('Error deleting cards from database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json({ message: "Card deleted successfully" });
    });
});

/**
 * @swagger
 * /api/cards:
 *   patch:
 *     summary: Update card information
 *     tags: [Cards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - is_active
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The ID of the card to update
 *                 example: 1
 *               is_active:
 *                 type: boolean
 *                 description: The new active status of the card
 *                 example: true
 *     responses:
 *       200:
 *         description: Card updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Card updated successfully"
 *       400:
 *         description: Bad request (missing or invalid fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid request data"
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
cardsRouter.patch("/cards", authenticateToken, async (req, res) => {
    console.log("✅ Update Cards endpoint hit");

    const userData = req.user;

    if (userData.role_id == 3) {
        return res.status(403).json({ message: "Access denied for this role" });
    }

    const data = JSON.parse(JSON.stringify(req.body));

    const cardId = data["id"]; // Get the card ID from the request body
    const isActive = data["is_active"]; // Get the new is_active status from the request body

    connection.query('UPDATE cards SET is_active = ?, updated_at = ? WHERE id = ?', [isActive, new Date(), cardId], (err, results) => {
        if (err) {
            console.error('Error updating card in database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json({ message: "Card updated successfully" });
    });
});

/**
 * @swagger
 * /api/cards/assign:
 *   post:
 *     summary: Assign a card to a user
 *     tags: [Cards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - user_id
 *             properties:
 *               code:
 *                 type: string
 *                 description: The ID of the card to be assigned
 *                 example: "HH II XX UU"
 *               user_id:
 *                 type: integer
 *                 description: The ID of the user to whom the card will be assigned
 *                 example: 2
 *     responses:
 *       200:
 *         description: Card assigned to user successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Card assigned to user successfully"
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


cardsRouter.post("/cards/assign", async (req, res) => {
    console.log("✅ Assign Card to User endpoint hit");
    
    const data = JSON.parse(JSON.stringify(req.body));
    const card_uid = data["code"].replace(/\s/g, "").trim(); // Get the card code from the request body
    
    const userId = data["user_id"]; // Get the user ID from the request body

    connection.query('UPDATE cards SET user_id = ?, updated_at = ? WHERE card_uid = ?', [userId, new Date(), card_uid], (err, results) => {
        if (err) {
            console.error('Error assigning card to user in database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json({ message: "Card assigned to user successfully" });
    }
);
});

export default cardsRouter;