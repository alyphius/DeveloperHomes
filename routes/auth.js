
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const db = require("../config/database");

// Remove password information before sending user data
function safeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio,
        profile_image: user.profile_image,
        created_at: user.created_at
    };
}

// =====================================
// CHECK USERNAME / EMAIL AVAILABILITY
// GET /api/auth/check-availability
// =====================================

router.get("/check-availability", async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
        const username = String(req.query.username || "").trim();
        const email = String(req.query.email || "").trim().toLowerCase();

        if (!username && !email) {
            return res.status(400).json({
                success: false,
                message: "Enter a username or email."
            });
        }

        const response = { success: true };

        if (username) {
            if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
                response.username = {
                    available: false,
                    message: "Use 3–50 letters, numbers, or underscores."
                };
            } else {
                const [rows] = await db.query(
                    "SELECT id FROM users WHERE username = ? LIMIT 1",
                    [username]
                );

                response.username = {
                    available: rows.length === 0,
                    message: rows.length === 0
                        ? "✓ Username is available"
                        : "✕ Username is already taken"
                };
            }
        }

        if (email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                response.email = {
                    available: false,
                    message: "Enter a valid email address."
                };
            } else {
                const [rows] = await db.query(
                    "SELECT id FROM users WHERE email = ? LIMIT 1",
                    [email]
                );

                response.email = {
                    available: rows.length === 0,
                    message: rows.length === 0
                        ? "✓ Email is available"
                        : "✕ Email is already registered"
                };
            }
        }

        res.json(response);

    } catch (error) {
        console.error("Availability check error:", error);

        res.status(500).json({
            success: false,
            message: "Could not check availability."
        });
    }
});

// =====================================
// REGISTER
// POST /api/auth/register
// =====================================

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required."
            });
        }

        const cleanUsername = String(username).trim();
        const cleanEmail = String(email).trim().toLowerCase();

        if (!/^[a-zA-Z0-9_]{3,50}$/.test(cleanUsername)) {
            return res.status(400).json({
                success: false,
                message: "Username must be 3–50 characters and use only letters, numbers and underscores."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const [existingUsers] = await db.query(
            "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
            [cleanUsername, cleanEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Username or email is already registered."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Public registration always creates a normal user
        const [result] = await db.query(
            `INSERT INTO users
             (username, email, password_hash, role)
             VALUES (?, ?, ?, 'user')`,
            [cleanUsername, cleanEmail, passwordHash]
        );

        res.status(201).json({
            success: true,
            message: "Registration successful.",
            userId: result.insertId
        });

    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Username or email is already registered."
            });
        }

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
});

// =====================================
// LOGIN
// POST /api/auth/login
// =====================================

router.post("/login", async (req, res) => {
    try {
        const { identifier, email, username, password } = req.body;

        const loginIdentifier = String(
            identifier || email || username || ""
        ).trim();

        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Email/username and password are required."
            });
        }

        const [users] = await db.query(
            `SELECT *
             FROM users
             WHERE email = ? OR username = ?
             LIMIT 1`,
            [
                loginIdentifier.toLowerCase(),
                loginIdentifier
            ]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid login credentials."
            });
        }

        const user = users[0];

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid login credentials."
            });
        }

        req.session.regenerate(sessionError => {
            if (sessionError) {
                console.error("Session error:", sessionError);

                return res.status(500).json({
                    success: false,
                    message: "Could not create login session."
                });
            }

            req.session.user = safeUser(user);

            req.session.save(saveError => {
                if (saveError) {
                    console.error("Session save error:", saveError);

                    return res.status(500).json({
                        success: false,
                        message: "Could not save login session."
                    });
                }

                res.json({
                    success: true,
                    message: "Login successful.",
                    user: req.session.user
                });
            });
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
});

// =====================================
// CURRENT USER
// GET /api/auth/me
// =====================================

router.get("/me", (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Not logged in."
        });
    }

    res.json({
        success: true,
        user: req.session.user
    });
});

// =====================================
// LOGOUT
// POST /api/auth/logout
// =====================================

router.post("/logout", (req, res) => {
    if (!req.session) {
        return res.json({
            success: true,
            message: "Already logged out."
        });
    }

    req.session.destroy(error => {
        if (error) {
            console.error("Logout error:", error);

            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("developerhomes.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });

        res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});

module.exports = router;
