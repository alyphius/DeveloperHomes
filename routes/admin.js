
const express = require("express");
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
            message: "Failed to load admin statistics"
        });
    }
});

// =====================================
// GET ALL USERS
// GET /api/admin/users
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
            message: "Failed to load users"
        });
    }
});

// =====================================
// CHANGE USER ROLE
// PUT /api/admin/users/:id/role
// OWNER ONLY
// =====================================

router.put(
    "/users/:id/role",
    requireOwner,
    async (req, res) => {
        try {
            const { role } = req.body;
            const userId = Number(req.params.id);

            const allowedRoles = ["user", "manager", "owner"];

            if (!Number.isInteger(userId) || userId < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            if (!allowedRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role"
                });
            }

            if (userId === req.session.user.id) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot change your own role"
                });
            }

            const [result] = await db.query(
                "UPDATE users SET role = ? WHERE id = ?",
                [role, userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            res.json({
                success: true,
                message: "User role updated successfully"
            });

        } catch (error) {
            console.error("Role update error:", error);

            res.status(500).json({
                success: false,
                message: "Failed to update user role"
            });
        }
    }
);

// =====================================
// DELETE USER
// DELETE /api/admin/users/:id
// OWNER ONLY
// =====================================

router.delete(
    "/users/:id",
    requireOwner,
    async (req, res) => {
        try {
            const userId = Number(req.params.id);

            if (!Number.isInteger(userId) || userId < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            if (userId === req.session.user.id) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot delete your own account"
                });
            }

            const [result] = await db.query(
                "DELETE FROM users WHERE id = ?",
                [userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            res.json({
                success: true,
                message: "User deleted successfully"
            });

        } catch (error) {
            console.error("Delete user error:", error);

            res.status(500).json({
                success: false,
                message: "Failed to delete user"
            });
        }
    }
);

module.exports = router;
