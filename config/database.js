
const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config();

// Aiven SSL certificate
let ssl;

if (process.env.DB_SSL_CA_PATH) {
    ssl = {
        ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, "utf8"),
        rejectUnauthorized: true
    };
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "developerhomes",

    ssl,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    charset: "utf8mb4",
    timezone: "Z"
});

async function testDatabaseConnection() {
    let connection;

    try {
        connection = await pool.getConnection();

        await connection.query("SELECT 1");

        console.log("MySQL database connected successfully!");

        return true;
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

module.exports = pool;
module.exports.testDatabaseConnection = testDatabaseConnection;
