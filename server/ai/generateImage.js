import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Lấy đường dẫn tuyệt đối của file hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function generateImage(prompt) {
  // Gọi API đúng format để lấy base64
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    size: "1024x1024",
    response_format: "b64_json",   // BẮT BUỘC để có b64_json
  });

  const imageBase64 = response.data[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("OpenAI không trả về b64_json — có thể API lỗi hoặc thiếu response_format.");
  }

  // Tạo đường dẫn đến thư mục assets/images
  const imageDir = path.resolve(__dirname, "../assets/images");

  // Nếu thư mục chưa tồn tại → tạo
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  // Tên file
  const imagePath = path.join(imageDir, "generated.png");

  // Lưu ảnh
  fs.writeFileSync(imagePath, Buffer.from(imageBase64, "base64"));

  return imagePath;
}

export { generateImage };
