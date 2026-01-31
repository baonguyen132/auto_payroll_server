import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                // maximum 100 requests per IP
  message: {
    status: 429,
    message: "Too many requests, please try again later"
  },
  standardHeaders: true,   // return RateLimit-* headers
  legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: "Too many login attempts"
  });

export { apiLimiter, loginLimiter };
