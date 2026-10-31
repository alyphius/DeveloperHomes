require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

// Route files
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const projectRoutes = require("./routes/projects");
const postRoutes = require("./routes/posts");
const userRoutes = require("./routes/users");

const app = express();

// Trust proxy when deployed behind a reverse proxy
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Basic application settings
app.disable("x-powered-by");

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "2mb"
}));

// Session configuration
if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is missing from .env");
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

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);

// API health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "DeveloperHomes server is running",
        timestamp: new Date().toISOString()
    });
});

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Main page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API 404 handler
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// General error handler
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

// Start server
const PORT = Number(process.env.PORT) || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log("--------------------------------------");
        console.log("       DeveloperHomes Server");
        console.log("--------------------------------------");
        console.log(`Server: http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
        console.log("--------------------------------------");
    });
}

module.exports = app;
