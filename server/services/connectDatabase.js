import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

var connection =  mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'payroll_user',
  password: process.env.DB_PASSWORD || 'payroll_pass',
  database: process.env.DB_NAME || 'auto_payroll',
  port: process.env.DB_PORT || 3306
});

connection.getConnection((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

export default connection;