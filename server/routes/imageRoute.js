import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const imageRouter = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route GET ảnh
imageRouter.get("/:filename", (req, res) => {
  const { filename } = req.params;

  // Đường dẫn đến thư mục assets/images
  const imagePath = path.resolve(__dirname, "../assets/images", filename);

  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({ error: "Image not found" });
    }
  });
});

export default imageRouter;
