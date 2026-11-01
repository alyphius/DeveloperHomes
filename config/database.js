
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Use Aiven CA certificate when available
const caPath = path.join(
    __dirname,
    "..",
    "certificates",
    "ca.pem"
);

if (fs.existsSync(caPath)) {
    config.ssl = {
        rejectUnauthorized: true,
        ca: fs.readFileSync(caPath, "utf8")
    };
}

const pool = mysql.createPool(config);

async function testDatabaseConnection() {
    let connection;

    try {
        connection = await pool.getConnection();

        const [rows] = await connection.query(
            "SELECT DATABASE() AS db, VERSION() AS version"
        );

        console.log("MySQL Connected Successfully!");
        console.log("Database:", rows[0].db);
        console.log("Version:", rows[0].version);

        return true;

    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = pool;
module.exports.testDatabaseConnection = testDatabaseConnection;
