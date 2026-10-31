
const express = require("express");
const router = express.Router();

const db = require("../config/database");
const { isAuthenticated } = require("../middleware/auth");

// =====================================
// GET ALL PROJECTS
// GET /api/projects
// =====================================

router.get("/", isAuthenticated, async (req, res) => {
    try {
        const [projects] = await db.query(
            `SELECT p.*, u.username
             FROM projects p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [req.session.user.id]
        );

        res.json({
            success: true,
            projects
        });

    } catch (error) {
        console.error("Get projects error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load projects"
        });
    }
});

// =====================================
// GET SINGLE PROJECT
// GET /api/projects/:id
// =====================================

router.get("/:id", isAuthenticated, async (req, res) => {
    try {
        const [projects] = await db.query(
            `SELECT *
             FROM projects
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.session.user.id]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        res.json({
            success: true,
            project: projects[0]
        });

    } catch (error) {
        console.error("Get project error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load project"
        });
    }
});

// =====================================
// CREATE PROJECT
// POST /api/projects
// =====================================

router.post("/", isAuthenticated, async (req, res) => {
    try {
        const {
            title,
            description,
            language,
            category,
            project_url
        } = req.body;

        if (!title || !String(title).trim()) {
            return res.status(400).json({
                success: false,
                message: "Project title is required"
            });
        }

        if (String(title).trim().length > 150) {
            return res.status(400).json({
                success: false,
                message: "Project title must not exceed 150 characters"
            });
        }

        const [result] = await db.query(
            `INSERT INTO projects
             (user_id, title, description, language, category, project_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.session.user.id,
                String(title).trim(),
                description || null,
                language || null,
                category || null,
                project_url || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            projectId: result.insertId
        });

    } catch (error) {
        console.error("Create project error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create project"
        });
    }
});

// =====================================
// UPDATE PROJECT
// PUT /api/projects/:id
// =====================================

router.put("/:id", isAuthenticated, async (req, res) => {
    try {
        const {
            title,
            description,
            language,
            category,
            project_url
        } = req.body;

        if (!title || !String(title).trim()) {
            return res.status(400).json({
                success: false,
                message: "Project title is required"
            });
        }

        const [result] = await db.query(
            `UPDATE projects
             SET title = ?,
                 description = ?,
                 language = ?,
                 category = ?,
                 project_url = ?
             WHERE id = ? AND user_id = ?`,
            [
                String(title).trim(),
                description || null,
                language || null,
                category || null,
                project_url || null,
                req.params.id,
                req.session.user.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found or no changes made"
            });
        }

        res.json({
            success: true,
            message: "Project updated successfully"
        });

    } catch (error) {
        console.error("Update project error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update project"
        });
    }
});

// =====================================
// DELETE PROJECT
// DELETE /api/projects/:id
// =====================================

router.delete("/:id", isAuthenticated, async (req, res) => {
    try {
        const [result] = await db.query(
            `DELETE FROM projects
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.session.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        res.json({
            success: true,
            message: "Project deleted successfully"
        });

    } catch (error) {
        console.error("Delete project error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete project"
        });
    }
});

module.exports = router;
