
const express = require("express");
const router = express.Router();

const db = require("../config/database");
const { isAuthenticated } = require("../middleware/auth");

// =====================================
// GET ALL COMMUNITY POSTS
// GET /api/posts
// =====================================

router.get("/", isAuthenticated, async (req, res) => {
    try {
        const [posts] = await db.query(
            `SELECT
                p.id,
                p.user_id,
                p.content,
                p.created_at,
                u.username,
                u.profile_image,
                (SELECT COUNT(*) FROM likes l
                 WHERE l.post_id = p.id) AS likes_count,
                (SELECT COUNT(*) FROM comments c
                 WHERE c.post_id = p.id) AS comments_count,
                EXISTS(
                    SELECT 1 FROM likes l
                    WHERE l.post_id = p.id
                    AND l.user_id = ?
                ) AS liked_by_me
             FROM posts p
             JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC`,
            [req.session.user.id]
        );

        res.json({
            success: true,
            posts
        });

    } catch (error) {
        console.error("Get posts error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load community posts"
        });
    }
});

// =====================================
// CREATE POST
// POST /api/posts
// =====================================

router.post("/", isAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !String(content).trim()) {
            return res.status(400).json({
                success: false,
                message: "Post content is required"
            });
        }

        const cleanContent = String(content).trim();

        if (cleanContent.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Post must not exceed 5000 characters"
            });
        }

        const [result] = await db.query(
            `INSERT INTO posts (user_id, content)
             VALUES (?, ?)`,
            [req.session.user.id, cleanContent]
        );

        res.status(201).json({
            success: true,
            message: "Post published successfully",
            postId: result.insertId
        });

    } catch (error) {
        console.error("Create post error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to publish post"
        });
    }
});

// =====================================
// DELETE OWN POST
// DELETE /api/posts/:id
// =====================================

router.delete("/:id", isAuthenticated, async (req, res) => {
    try {
        const [result] = await db.query(
            `DELETE FROM posts
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.session.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Post not found or you do not own it"
            });
        }

        res.json({
            success: true,
            message: "Post deleted successfully"
        });

    } catch (error) {
        console.error("Delete post error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete post"
        });
    }
});

// =====================================
// GET POST COMMENTS
// GET /api/posts/:id/comments
// =====================================

router.get("/:id/comments", isAuthenticated, async (req, res) => {
    try {
        const [comments] = await db.query(
            `SELECT
                c.id,
                c.post_id,
                c.user_id,
                c.content,
                c.created_at,
                u.username,
                u.profile_image
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.post_id = ?
             ORDER BY c.created_at ASC`,
            [req.params.id]
        );

        res.json({
            success: true,
            comments
        });

    } catch (error) {
        console.error("Get comments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load comments"
        });
    }
});

// =====================================
// ADD COMMENT
// POST /api/posts/:id/comments
// =====================================

router.post("/:id/comments", isAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !String(content).trim()) {
            return res.status(400).json({
                success: false,
                message: "Comment cannot be empty"
            });
        }

        const cleanContent = String(content).trim();

        if (cleanContent.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Comment must not exceed 2000 characters"
            });
        }

        const [posts] = await db.query(
            "SELECT id, user_id FROM posts WHERE id = ?",
            [req.params.id]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const [result] = await db.query(
            `INSERT INTO comments (post_id, user_id, content)
             VALUES (?, ?, ?)`,
            [
                req.params.id,
                req.session.user.id,
                cleanContent
            ]
        );

        // Notify post owner, unless they commented on their own post
        if (posts[0].user_id !== req.session.user.id) {
            await db.query(
                `INSERT INTO notifications (user_id, message)
                 VALUES (?, ?)`,
                [
                    posts[0].user_id,
                    `${req.session.user.username} commented on your post.`
                ]
            );
        }

        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            commentId: result.insertId
        });

    } catch (error) {
        console.error("Add comment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add comment"
        });
    }
});

// =====================================
// LIKE / UNLIKE POST
// POST /api/posts/:id/like
// =====================================

router.post("/:id/like", isAuthenticated, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [posts] = await connection.query(
            "SELECT id, user_id FROM posts WHERE id = ?",
            [req.params.id]
        );

        if (posts.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }

        const post = posts[0];
        const userId = req.session.user.id;

        const [existingLikes] = await connection.query(
            `SELECT id FROM likes
             WHERE post_id = ? AND user_id = ?`,
            [req.params.id, userId]
        );

        let liked;

        if (existingLikes.length > 0) {
            await connection.query(
                `DELETE FROM likes
                 WHERE post_id = ? AND user_id = ?`,
                [req.params.id, userId]
            );

            liked = false;

        } else {
            await connection.query(
                `INSERT INTO likes (post_id, user_id)
                 VALUES (?, ?)`,
                [req.params.id, userId]
            );

            liked = true;

            if (post.user_id !== userId) {
                await connection.query(
                    `INSERT INTO notifications (user_id, message)
                     VALUES (?, ?)`,
                    [
                        post.user_id,
                        `${req.session.user.username} liked your post.`
                    ]
                );
            }
        }

        const [[count]] = await connection.query(
            "SELECT COUNT(*) AS total FROM likes WHERE post_id = ?",
            [req.params.id]
        );

        await connection.commit();

        res.json({
            success: true,
            liked,
            likesCount: count.total,
            message: liked ? "Post liked" : "Post unliked"
        });

    } catch (error) {
        await connection.rollback();

        console.error("Like post error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update like"
        });

    } finally {
        connection.release();
    }
});

// =====================================
// GET MY NOTIFICATIONS
// GET /api/posts/notifications
// =====================================

router.get("/notifications", isAuthenticated, async (req, res) => {
    try {
        const [notifications] = await db.query(
            `SELECT *
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.session.user.id]
        );

        res.json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error("Notifications error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load notifications"
        });
    }
});

// =====================================
// MARK NOTIFICATION AS READ
// PUT /api/posts/notifications/:id/read
// =====================================

router.put(
    "/notifications/:id/read",
    isAuthenticated,
    async (req, res) => {
        try {
            const [result] = await db.query(
                `UPDATE notifications
                 SET is_read = TRUE
                 WHERE id = ? AND user_id = ?`,
                [
                    req.params.id,
                    req.session.user.id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Notification not found"
                });
            }

            res.json({
                success: true,
                message: "Notification marked as read"
            });

        } catch (error) {
            console.error("Mark notification error:", error);

            res.status(500).json({
                success: false,
                message: "Failed to update notification"
            });
        }
    }
);

module.exports = router;
