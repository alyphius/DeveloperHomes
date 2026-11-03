
"use strict";

// =============================================
// DeveloperHomes - Admin Access Middleware
// =============================================

function isApiRequest(req) {
    return req.originalUrl.startsWith("/api/");
}

// Require any logged-in account
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        if (isApiRequest(req)) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        return res.redirect("/auth.html");
    }

    next();
}

// Allow only Owner and Manager
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        if (isApiRequest(req)) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        return res.redirect("/auth.html");
    }

    const role = String(req.session.user.role || "").toLowerCase();

    if (role !== "owner" && role !== "manager") {
        if (isApiRequest(req)) {
            return res.status(403).json({
                success: false,
                message: "Only Owner and Manager accounts can access this resource."
            });
        }

        return res.status(403).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Access Denied | DeveloperHomes</title>
                <style>
                    body {
                        margin: 0;
                        min-height: 100vh;
                        display: grid;
                        place-items: center;
                        background: #10172a;
                        color: white;
                        font-family: Arial, sans-serif;
                        text-align: center;
                    }

                    .box {
                        max-width: 420px;
                        margin: 20px;
                        padding: 35px;
                        background: #1e293b;
                        border-radius: 18px;
                    }

                    a {
                        display: inline-block;
                        margin-top: 15px;
                        padding: 12px 20px;
                        border-radius: 8px;
                        background: #2563eb;
                        color: white;
                        text-decoration: none;
                    }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>Access Denied 🔒</h1>
                    <p>
                        This management page is only available
                        to Owner and Manager accounts.
                    </p>
                    <a href="/dashboard.html">Return to Dashboard</a>
                </div>
            </body>
            </html>
        `);
    }

    next();
}

// Allow Owner only
function requireOwner(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    const role = String(req.session.user.role || "").toLowerCase();

    if (role !== "owner") {
        return res.status(403).json({
            success: false,
            message: "Only the Owner can perform this action."
        });
    }

    next();
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireOwner
};
