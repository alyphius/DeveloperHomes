
require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./config/database");

async function createOwner() {
    try {
        const username = process.env.OWNER_NAME;
        const email = process.env.OWNER_EMAIL;
        const password = process.env.OWNER_PASSWORD;

        if (!username || !email || !password) {
            throw new Error(
                "OWNER_NAME, OWNER_EMAIL and OWNER_PASSWORD must be set in .env"
            );
        }

        if (password.length < 8) {
            throw new Error(
                "Owner password must contain at least 8 characters"
            );
        }

        // Check whether an owner account already exists
        const [existingOwner] = await db.query(
            "SELECT id, username, email, role FROM users WHERE role = 'owner' LIMIT 1"
        );

        if (existingOwner.length > 0) {
            console.log("An owner account already exists.");
            console.log("Username:", existingOwner[0].username);
            console.log("Email:", existingOwner[0].email);
            return;
        }

        // Check whether the username or email is already registered
        const [existingUser] = await db.query(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            [username, email]
        );

        if (existingUser.length > 0) {
            throw new Error(
                "The owner username or email is already registered."
            );
        }

        // Hash owner password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create owner account
        const [result] = await db.query(
            `INSERT INTO users
             (username, email, password_hash, role)
             VALUES (?, ?, ?, 'owner')`,
            [username, email, passwordHash]
        );

        console.log("--------------------------------");
        console.log("DeveloperHomes Owner Created!");
        console.log("--------------------------------");
        console.log("Owner ID:", result.insertId);
        console.log("Username:", username);
        console.log("Email:", email);
        console.log("Role: owner");
        console.log("--------------------------------");

    } catch (error) {
        console.error("Owner creation failed:", error.message);
        process.exitCode = 1;

    } finally {
        await db.end();
    }
}

createOwner();
