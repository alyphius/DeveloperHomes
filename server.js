// =============================================
// DeveloperHomes - Main Server
// =============================================

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

// Database connection
const {
    testDatabaseConnection
} = require("./config/database");

// Middleware
const {
    requireAdmin
} = require("./middleware/admin");

// Route files
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const projectRoutes = require("./routes/projects");
const postRoutes = require("./routes/posts");
const userRoutes = require("./routes/users");

// Initialize Express
const app = express();

// Trust proxy when deployed behind Render
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Security settings
app.disable("x-powered-by");

// Request body configuration
app.use(express.json({ limit: "2mb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "2mb"
    })
);

// =============================================
// SESSION CONFIGURATION
// =============================================

if (!process.env.SESSION_SECRET) {
    throw new Error(
        "SESSION_SECRET environment variable is missing"
    );
}

app.use(
    session({
        name: "developerhomes.sid",

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

// =============================================
// API ROUTES
// =============================================

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);

// =============================================
// HEALTH CHECK
// =============================================

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        application: "DeveloperHomes",
        message: "DeveloperHomes server is running",
        timestamp: new Date().toISOString()
    });
});

// =============================================
// PROTECTED OWNER / MANAGER DASHBOARD
// IMPORTANT: This must be BEFORE express.static
// =============================================

app.get("/admin.html", requireAdmin, (req, res) => {

    // Prevent browser caching of private admin content
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0"
    });

    res.sendFile(
        path.join(__dirname, "public", "admin.html")
    );
});

// =============================================
// SERVE PUBLIC FRONTEND
// =============================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// =============================================
// MAIN PAGE
// =============================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// =============================================
// API 404 HANDLER
// =============================================

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// =============================================
// GENERAL ERROR HANDLER
// =============================================

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(err.status || 500).json({
        success: false,
        message:
            process.env.NODE_ENV === "production"
                ? "An unexpected server error occurred"
                : err.message
    });
});

// =============================================
// START SERVER
// =============================================

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
    try {
        console.log("--------------------------------------");
        console.log("       DeveloperHomes Server");
        console.log("--------------------------------------");

        console.log("Connecting to MySQL database...");

        await testDatabaseConnection();

        app.listen(PORT, "0.0.0.0", () => {
            console.log("--------------------------------------");
            console.log("DeveloperHomes started successfully!");
            console.log(`Port: ${PORT}`);
            console.log(
                `Environment: ${process.env.NODE_ENV || "development"}`
            );
            console.log("--------------------------------------");
        });

    } catch (error) {
        console.error("--------------------------------------");
        console.error("DeveloperHomes startup failed!");
        console.error(error.message);
        console.error("--------------------------------------");

        process.exit(1);
    }
}

// Start only when executed directly
if (require.main === module) {
    startServer();
}

module.exports = app;
