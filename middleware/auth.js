
// =====================================
// DeveloperHomes Authentication
// =====================================

// Check whether the user is logged in
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }

    // API requests receive JSON
    if (req.originalUrl.startsWith("/api/")) {
        return res.status(401).json({
            success: false,
            message: "Please log in to continue"
        });
    }

    return res.redirect("/login.html");
}

// Check whether the user is an owner
function isOwner(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    if (req.session.user.role !== "owner") {
        return res.status(403).json({
            success: false,
            message: "Owner access required"
        });
    }

    next();
}

// Check whether the user is an owner or manager
function isManager(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const role = req.session.user.role;

    if (role !== "owner" && role !== "manager") {
        return res.status(403).json({
            success: false,
            message: "Manager access required"
        });
    }

    next();
}

// Export middleware
module.exports = {
    isAuthenticated,
    isOwner,
    isManager
};
