
const { isAuthenticated } = require("./auth");

// Allow only owners and managers
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Please log in first"
        });
    }

    const role = req.session.user.role;

    if (role !== "owner" && role !== "manager") {
        return res.status(403).json({
            success: false,
            message: "Administrator permission required"
        });
    }

    next();
}

// Allow only the owner
function requireOwner(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Please log in first"
        });
    }

    if (req.session.user.role !== "owner") {
        return res.status(403).json({
            success: false,
            message: "Only the owner can perform this action"
        });
    }

    next();
}

module.exports = {
    requireAdmin,
    requireOwner,
    isAuthenticated
};
