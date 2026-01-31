import express from "express";
import { swaggerUi, swaggerSpec } from './services/swagger.js';
import cardsRouter from "./routes/cards.js";
import accessLogRouter from "./routes/access_log.js";
import employeeRouter from "./routes/employee.js";
import authRouter from "./routes/auth.js";
import productRouter from "./routes/product.js";
import cors from "cors";
import aiRouter from "./routes/ai.js";
import imageRouter from "./routes/imageRoute.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'ngrok-skip-browser-warning'
  ],
}));

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api', apiLimiter, cardsRouter);
app.use('/api', apiLimiter, accessLogRouter)
app.use('/api', apiLimiter, employeeRouter);
app.use('/api', apiLimiter, authRouter);
app.use('/api', apiLimiter, aiRouter);
app.use('/api', apiLimiter, productRouter);
app.use(apiLimiter, imageRouter);

// Run server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy: http://localhost:${PORT}`);
  console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
});