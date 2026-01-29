import express, { json } from "express";
import connection from "../services/connectDatabase.js";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { creditEmployeeWork } from "../blockchain/utils/creditEmployeeWork.js";

const accessLogRouter = express.Router();

/**
 * @swagger
 * tags:
 *   - name: AccessLog
 *     description: API for managing access logs
 */


/**
 * @swagger
 * /api/access-log:
 *   post:
 *     summary: Access Log add access log entry
 *     tags: [AccessLog]
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
 *               access_type:
 *                 type: integer
 *                 description: The type of access (1 for entry, 0 for exit)
 *                 example: 1
 *     responses:
 *       200:
 *         description: Access log entry added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Access Log received"
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
accessLogRouter.post("/access-log", async (req, res) => {
    console.log("✅ Access Log endpoint hit");
    const data = JSON.parse(JSON.stringify(req.body));

    const code = data["code"].replace(/\s/g, "").trim();
    const access_type = data["access_type"];

    let status = 0;

    const now = new Date();

    const vnDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnHour = new Date(vnDate).getHours();
    console.log(vnHour);

    if (vnHour >= 7 && vnHour <= 8 || vnHour >= 17 && vnHour <= 18) {
        status = 1;
    }


    connection.query("SELECT * FROM cards WHERE card_uid = ?", [code], (error, results) => {
        if (error) {
            console.error("❌ Database query error:", error);
            res.status(500).json({ message: "Database query error", error });
            return;
        }

        if (results.length === 0) {
            console.log("❌ Card not found");
            res.status(404).json({ message: "Card not found" });
            return;
        }

        const userId = results[0].user_id;
        const cardId = results[0].id;

        if (!userId) {
            console.log("❌ Card is not assigned to any user");
            res.status(400).json({ message: "Not successful" });
            return;
        }
        else {

            if (Number(access_type) === 1) {
                // Người dùng vừa ra, tìm lần vào cuối cùng
                connection.query(
                    "SELECT * FROM access_logs WHERE user_id = ? AND access_type = 0 ORDER BY access_time DESC LIMIT 1",
                    [parseInt(userId)],
                    (lastLogError, lastLogResults) => {
                        if (lastLogError) {
                            console.error("❌ Error fetching last access log:", lastLogError);
                            return res.status(500).json({ message: "Không thành công", lastLogError });
                        }

                        if (lastLogResults.length === 0) {
                            return res.json({ message: "Chưa có lần vào trước đó." });
                        }

                        const checkin = new Date(lastLogResults[0].access_time);
                        const checkout = now; // thời gian hiện tại khi ra

                        // Nếu cần truyền giây sang creditEmployeeWork
                        const checkinSeconds = Math.floor(checkin.getTime() / 1000);
                        const checkoutSeconds = Math.floor(checkout.getTime() / 1000);

                        const s = creditEmployeeWork(userId+"", checkinSeconds, checkoutSeconds);
                        console.log("✅ Employee credited successfully:", s);``
                    }
                );
            }


            connection.query(
                "INSERT INTO access_logs (user_id, card_id, access_type, status, access_time, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                [parseInt(userId), parseInt(cardId), parseInt(access_type), parseInt(status), now, now],
                (insertError, insertResults) => {
                    if (insertError) {
                        console.error("❌ Error inserting access log:", insertError);
                        res.status(500).json({ message: "Not successful", insertError });
                        return;
                    }

                    console.log("✅ Access log entry added successfully");
                    res.status(200).json({ message: "Access log entry added successfully", insertResults });
                }
            );
        }
    });
});


/**
 * @swagger
 * /api/access-logs:
 *   get:
 *     summary: Access Log endpoint to retrieve all access logs
 *     tags: [AccessLog]
 *     responses:
 *       200:
 *         description: Access logs retrieved successfully
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
 *                   access_time:
 *                     type: string
 *                     example: "2024-01-01T00:00:00.000Z"
 *                   access_type:
 *                     type: integer
 *                     example: 1
 *                   status:
 *                     type: integer
 *                     example: 1
 *                   card_id:
 *                     type: integer
 *                     example: 1
 *                   card_uid:
 *                     type: string
 *                     example: "AA AA AA AA"
 *                   user_id:
 *                     type: integer
 *                     example: 1
 *                   username:
 *                     type: string
 *                     example: "John Doe"
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

accessLogRouter.get("/access-logs", authenticateToken, async (req, res) => {
    console.log("✅ Get Access Logs endpoint hit");

    const userData = req.user;

    if (userData.role_id == 3) {
        return res.status(403).json({ message: "Access denied for this role" });
    }


    connection.query('SELECT access_logs.id , access_time , access_type , access_logs.status, card_id , cards.card_uid , access_logs.user_id , users.username FROM access_logs LEFT JOIN cards ON access_logs.card_id = cards.id LEFT JOIN users ON users.id = access_logs.user_id', (err, results) => {
        if (err) {
            console.error('Error fetching access logs from database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json({ message: "Access logs fetched successfully", access_logs: results });
    });
});

/**
 * @swagger
 * /api/access-logs/{userId}:
 *   get:
 *     summary: Access Log endpoint to retrieve all access logs for a specific user
 *     tags: [AccessLog]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID of the user to retrieve access logs for
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Access logs retrieved successfully
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
 *                   access_time:
 *                     type: string
 *                     example: "2024-01-01T00:00:00.000Z"
 *                   access_type:
 *                     type: integer
 *                     example: 1
 *                   status:
 *                     type: integer
 *                     example: 1
 *                   card_id:
 *                     type: integer
 *                     example: 1
 *                   card_uid:
 *                     type: string
 *                     example: "AA AA AA AA"
 *                   user_id:
 *                     type: integer
 *                     example: 1
 *                   username:
 *                     type: string
 *                     example: "John Doe"
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

accessLogRouter.get("/access-logs/:userId", authenticateToken, async (req, res) => {
    const userId = req.params.userId;
    const userData = req.user;

    if (userData.role_id == 3 && userId != userData.id) {
        return res.status(403).json({ message: "Access denied for this userId" });
    }

    console.log(`✅ Get Access Logs for User ID: ${userId} endpoint hit`);

    connection.query('SELECT access_logs.id , access_time , access_type , access_logs.status, card_id , cards.card_uid , access_logs.user_id , users.username FROM access_logs LEFT JOIN cards ON access_logs.card_id = cards.id LEFT JOIN users ON users.id = access_logs.user_id WHERE access_logs.user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching access logs from database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json({ message: "Access logs fetched successfully", access_logs: results });
    });
});

export default accessLogRouter;
