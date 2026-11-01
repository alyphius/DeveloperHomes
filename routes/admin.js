
const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const db = require("../config/database");
const { requireAdmin, requireOwner } = require("../middleware/admin");

// =====================================
// ADMIN DASHBOARD STATISTICS
// GET /api/admin/stats
// =====================================

router.get("/stats", requireAdmin, async (req, res) => {
    try {
        const [[users]] = await db.query(
            "SELECT COUNT(*) AS total FROM users"
        );

        const [[projects]] = await db.query(
            "SELECT COUNT(*) AS total FROM projects"
        );

        const [[posts]] = await db.query(
            "SELECT COUNT(*) AS total FROM posts"
        );

        const [[snippets]] = await db.query(
            "SELECT COUNT(*) AS total FROM code_snippets"
        );

        res.json({
            success: true,
            stats: {
                users: users.total,
                projects: projects.total,
                posts: posts.total,
                snippets: snippets.total
            }
        });

    } catch (error) {
        console.error("Admin statistics error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load admin statistics."
        });
    }
});

// =====================================
// GET ALL USERS
// GET /api/admin/users
// OWNER AND MANAGER
// =====================================

router.get("/users", requireAdmin, async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, username, email, role, bio,
                    profile_image, created_at
             FROM users
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            users
        });

    } catch (error) {
        console.error("Admin users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load users."
        });
    }
});

// =====================================
// CREATE MANAGER
// POST /api/admin/managers
// OWNER ONLY
// =====================================

router.post("/managers", requireOwner, async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username must be 3–50 characters using letters, numbers, and underscores."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const [existingUsers] = await db.query(
            `SELECT id
             FROM users
             WHERE username = ? OR email = ?
             LIMIT 1`,
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Username or email is already registered."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [result] = await db.query(
            `INSERT INTO users
             (username, email, password_hash, role)
             VALUES (?, ?, ?, 'manager')`,
            [username, email, passwordHash]
        );

        res.status(201).json({
            success: true,
            message: "Manager account created successfully.",
            userId: result.insertId
        });

    } catch (error) {
        console.error("Manager creation error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Username or email is already registered."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create Manager account."
        });
    }
});

// =====================================
// CHANGE USER ROLE
// PUT /api/admin/users/:id/role
// OWNER ONLY
// =====================================

router.put("/users/:id/role", requireOwner, async (req, res) => {

    const userId = Number(req.params.id);
    const newRole = req.body.role;

    const allowedRoles = ["user", "manager", "owner"];

    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    if (!allowedRoles.includes(newRole)) {
        return res.status(400).json({
            success: false,
            message: "Invalid role."
        });
    }

    if (userId === Number(req.session.user.id)) {
        return res.status(400).json({
            success: false,
            message: "You cannot change your own role."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();

        await connection.beginTransaction();

        const [targetRows] = await connection.query(
            "SELECT id, role FROM users WHERE id = ? FOR UPDATE",
            [userId]
        );

        if (targetRows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const target = targetRows[0];

        if (target.role === "owner" && newRole !== "owner") {

            const [owners] = await connection.query(
                "SELECT id FROM users WHERE role = 'owner' FOR UPDATE"
            );

            if (owners.length <= 1) {
                await connection.rollback();

                return res.status(403).json({
                    success: false,
                    message: "You cannot demote the last Owner."
                });
            }
        }

        await connection.query(
            "UPDATE users SET role = ? WHERE id = ?",
            [newRole, userId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "User role updated successfully."
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Role update error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update user role."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// =====================================
// DELETE USER
// DELETE /api/admin/users/:id
// OWNER ONLY
// =====================================

router.delete("/users/:id", requireOwner, async (req, res) => {

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID."
        });
    }

    if (userId === Number(req.session.user.id)) {
        return res.status(400).json({
            success: false,
            message: "You cannot delete your own account."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();

        await connection.beginTransaction();

        const [targetRows] = await connection.query(
            "SELECT id, role FROM users WHERE id = ? FOR UPDATE",
            [userId]
        );

        if (targetRows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const target = targetRows[0];

        if (target.role === "owner") {

            const [owners] = await connection.query(
                "SELECT id FROM users WHERE role = 'owner' FOR UPDATE"
            );

            if (owners.length <= 1) {
                await connection.rollback();

                return res.status(403).json({
                    success: false,
                    message: "You cannot delete the last Owner."
                });
            }
        }

        await connection.query(
            "DELETE FROM users WHERE id = ?",
            [userId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "User deleted successfully."
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Delete user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete user."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
