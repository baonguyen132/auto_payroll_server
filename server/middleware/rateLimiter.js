const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,                // tối đa 100 request / IP
  message: {
    status: 429,
    message: "Too many requests, please try again later"
  },
  standardHeaders: true,   // trả về RateLimit-* headers
  legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: "Too many login attempts"
  });

module.exports = { apiLimiter, loginLimiter };
