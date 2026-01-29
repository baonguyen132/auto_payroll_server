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

app.use('/api', cardsRouter);
app.use('/api', accessLogRouter)
app.use('/api', employeeRouter);
app.use('/api', authRouter);
app.use('/api', aiRouter);
app.use('/api', productRouter);
app.use(imageRouter);

// Run server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy: http://localhost:${PORT}`);
  console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
});