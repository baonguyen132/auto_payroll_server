import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateAccessToken = (user) => {
  // user: object chứa thông tin user, ví dụ { id, email, role }
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role_id: user.role_id,
      wallet_address: user.wallet_address,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" } // token hết hạn sau 1 giờ
  );
};