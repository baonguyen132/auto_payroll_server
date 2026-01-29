import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: "API for Auto Payroll Application",
      version: '1.0.0',
      description: "API RESTful for Auto Payroll Application",
    },
    servers: [ // phải là servers
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { // đúng chính tả
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: "Enter your JWT token in the format **Bearer &lt;token>**",
        },
      },
    },
    security: [
      {
        bearerAuth: [], // trùng tên với trên
      },
    ],
  },
  apis: ['./routes/*.js'], // đường dẫn tới file chứa @swagger docs
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
