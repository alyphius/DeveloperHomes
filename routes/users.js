
const express = require("express");
const router = express.Router();

const db = require("../config/database");
const { isAuthenticated } = require("../middleware/auth");

// GET MY PROFILE
router.get("/me", isAuthenticated, async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, username, email, role, bio,
                    profile_image, created_at
             FROM users
             WHERE id = ?`,
            [req.session.user.id]
        );

        if (!users.length) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json({ user: users[0] });

    } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({
            message: "Could not load profile."
        });
    }
});

// UPDATE MY PROFILE
router.put("/me", isAuthenticated, async (req, res) => {
    try {
        const { username, bio, profile_image } = req.body;

        if (!username || username.trim().length < 3 ||
            username.trim().length > 50) {
            return res.status(400).json({
                message: "Username must contain 3–50 characters."
            });
        }

        const cleanUsername = username.trim();

        if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
            return res.status(400).json({
                message: "Username can contain only letters, numbers and underscores."
            });
        }

        const [existing] = await db.query(
            "SELECT id FROM users WHERE username = ? AND id != ?",
            [cleanUsername, req.session.user.id]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "Username is already taken."
            });
        }

        const image = profile_image || null;

        if (image && !/^https?:\/\/.+/i.test(image)) {
            return res.status(400).json({
                message: "Profile image must be a valid HTTP or HTTPS URL."
            });
        }

        await db.query(
            `UPDATE users
             SET username = ?, bio = ?, profile_image = ?
             WHERE id = ?`,
            [
                cleanUsername,
                typeof bio === "string" ? bio.trim() : "",
                image,
                req.session.user.id
            ]
        );

        req.session.user.username = cleanUsername;
        req.session.user.bio = typeof bio === "string" ? bio.trim() : "";
        req.session.user.profile_image = image;

        res.json({
            message: "Profile updated successfully.",
            user: req.session.user
        });

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({
            message: "Could not update profile."
        });
    }
});

// GET MY CODE SNIPPETS
router.get("/snippets", isAuthenticated, async (req, res) => {
    try {
        const [snippets] = await db.query(
            `SELECT id, title, language, created_at
             FROM code_snippets
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.session.user.id]
        );

        res.json({ snippets });

    } catch (error) {
        console.error("Load snippets error:", error);
        res.status(500).json({
            message: "Could not load code snippets."
        });
    }
});

// CREATE CODE SNIPPET
router.post("/snippets", isAuthenticated, async (req, res) => {
    try {
        const { title, language, code } = req.body;

        if (!title || !title.trim() || title.trim().length > 120) {
            return res.status(400).json({
                message: "Title is required and must not exceed 120 characters."
            });
        }

        if (typeof code !== "string" || !code.trim()) {
            return res.status(400).json({
                message: "Code cannot be empty."
            });
        }

        const cleanLanguage =
            typeof language === "string" && language.trim()
                ? language.trim().slice(0, 50)
                : "text";

        const [result] = await db.query(
            `INSERT INTO code_snippets
             (user_id, title, language, code)
             VALUES (?, ?, ?, ?)`,
            [
                req.session.user.id,
                title.trim(),
                cleanLanguage,
                code
            ]
        );

        const [snippets] = await db.query(
            `SELECT id, title, language, code, created_at
             FROM code_snippets
             WHERE id = ? AND user_id = ?`,
            [result.insertId, req.session.user.id]
        );

        res.status(201).json({
            message: "Code snippet saved successfully.",
            snippet: snippets[0]
        });

    } catch (error) {
        console.error("Create snippet error:", error);
        res.status(500).json({
            message: "Could not save code snippet."
        });
    }
});

// UPDATE CODE SNIPPET
router.put("/snippets/:id", isAuthenticated, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { title, language, code } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid snippet ID."
            });
        }

        if (!title || !title.trim() || title.trim().length > 120) {
            return res.status(400).json({
                message: "A valid title is required."
            });
        }

        if (typeof code !== "string" || !code.trim()) {
            return res.status(400).json({
                message: "Code cannot be empty."
            });
        }

        const cleanLanguage =
            typeof language === "string" && language.trim()
                ? language.trim().slice(0, 50)
                : "text";

        const [result] = await db.query(
            `UPDATE code_snippets
             SET title = ?, language = ?, code = ?
             WHERE id = ? AND user_id = ?`,
            [
                title.trim(),
                cleanLanguage,
                code,
                id,
                req.session.user.id
            ]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Snippet not found."
            });
        }

        const [snippets] = await db.query(
            `SELECT id, title, language, code, created_at
             FROM code_snippets
             WHERE id = ? AND user_id = ?`,
            [id, req.session.user.id]
        );

        res.json({
            message: "Code snippet updated successfully.",
            snippet: snippets[0]
        });

    } catch (error) {
        console.error("Update snippet error:", error);
        res.status(500).json({
            message: "Could not update code snippet."
        });
    }
});

// DELETE CODE SNIPPET
router.delete("/snippets/:id", isAuthenticated, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid snippet ID."
            });
        }

        const [result] = await db.query(
            `DELETE FROM code_snippets
             WHERE id = ? AND user_id = ?`,
            [id, req.session.user.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Snippet not found."
            });
        }

        res.json({
            message: "Code snippet deleted successfully."
        });

    } catch (error) {
        console.error("Delete snippet error:", error);
        res.status(500).json({
            message: "Could not delete code snippet."
        });
    }
});

// GET PUBLIC USER PROFILE
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid user ID."
            });
        }

        const [users] = await db.query(
            `SELECT id, username, bio, profile_image, created_at
             FROM users
             WHERE id = ?`,
            [id]
        );

        if (!users.length) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const [projects] = await db.query(
            `SELECT id, title, description, language,
                    category, project_url, created_at
             FROM projects
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [id]
        );

        res.json({
            user: users[0],
            projects
        });

    } catch (error) {
        console.error("Public profile error:", error);
        res.status(500).json({
            message: "Could not load user profile."
        });
    }
});

module.exports = router;
