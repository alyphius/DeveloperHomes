
/* =========================================
   DEVELOPERHOMES - MAIN APPLICATION
   ========================================= */

"use strict";

const DeveloperHomes = {
    apiBase: "/api",

    // Send API requests
    async request(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    },

    // Get logged-in user
    async getCurrentUser() {
        try {
            const result = await this.request("/api/auth/me");
            return result.user || null;
        } catch {
            return null;
        }
    },

    // Protect pages that require login
    async requireLogin() {
        const user = await this.getCurrentUser();

        if (!user) {
            window.location.href = "/login.html";
            return null;
        }

        return user;
    },

    // Display messages
    showMessage(element, message, type = "info") {
        if (!element) return;

        element.textContent = message;
        element.className = `message ${type}`;
        element.hidden = false;
    },

    // Clear messages
    clearMessage(element) {
        if (!element) return;

        element.textContent = "";
        element.hidden = true;
    },

    // Format dates
    formatDate(date) {
        if (!date) return "Unknown date";

        const value = new Date(date);

        if (Number.isNaN(value.getTime())) {
            return "Unknown date";
        }

        return value.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    },

    // Format date and time
    formatDateTime(date) {
        if (!date) return "Unknown date";

        const value = new Date(date);

        if (Number.isNaN(value.getTime())) {
            return "Unknown date";
        }

        return value.toLocaleString();
    },

    // Escape HTML before inserting user content
    escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    },

    // Get initials for avatars
    getInitials(name) {
        if (!name) return "DH";

        return String(name)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("");
    },

    // Set profile avatar
    setAvatar(element, name, imageUrl) {
        if (!element) return;

        if (imageUrl) {
            element.innerHTML = "";
            element.style.backgroundImage = `url("${String(imageUrl).replace(/["\\]/g, "")}")`;
            element.style.backgroundSize = "cover";
            element.style.backgroundPosition = "center";
            element.textContent = "";
        } else {
            element.style.backgroundImage = "none";
            element.textContent = this.getInitials(name);
        }
    },

    // Logout
    async logout() {
        try {
            await this.request("/api/auth/logout", {
                method: "POST"
            });
        } catch (error) {
            console.error("Logout error:", error.message);
        }

        window.location.href = "/login.html";
    },

    // Theme management
    initTheme() {
        const savedTheme = localStorage.getItem("dh-theme") || "purple";
        const savedMode = localStorage.getItem("dh-mode") || "light";

        this.applyTheme(savedTheme, savedMode);
    },

    applyTheme(theme, mode) {
        const allowedThemes = ["purple", "blue", "green", "orange"];
        const allowedModes = ["light", "dark"];

        if (!allowedThemes.includes(theme)) {
            theme = "purple";
        }

        if (!allowedModes.includes(mode)) {
            mode = "light";
        }

        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.setAttribute("data-mode", mode);

        localStorage.setItem("dh-theme", theme);
        localStorage.setItem("dh-mode", mode);

        const themeSelect = document.getElementById("themeSelect");
        const modeToggle = document.getElementById("darkModeToggle");

        if (themeSelect) {
            themeSelect.value = theme;
        }

        if (modeToggle) {
            modeToggle.checked = mode === "dark";
        }
    },

    // Initialize navigation
    initNavigation() {
        const menuToggle = document.getElementById("menuToggle");
        const navLinks = document.getElementById("navLinks");

        if (menuToggle && navLinks) {
            menuToggle.addEventListener("click", () => {
                navLinks.classList.toggle("open");

                menuToggle.setAttribute(
                    "aria-expanded",
                    navLinks.classList.contains("open") ? "true" : "false"
                );
            });

            navLinks.querySelectorAll("a").forEach(link => {
                link.addEventListener("click", () => {
                    navLinks.classList.remove("open");
                    menuToggle.setAttribute("aria-expanded", "false");
                });
            });
        }

        document.querySelectorAll("#logoutButton").forEach(button => {
            button.addEventListener("click", () => this.logout());
        });
    },

    // Initialize footer year
    initFooter() {
        const year = document.getElementById("currentYear");

        if (year) {
            year.textContent = new Date().getFullYear();
        }
    },

    // Initialize theme controls
    initThemeControls() {
        const themeSelect = document.getElementById("themeSelect");
        const modeToggle = document.getElementById("darkModeToggle");

        if (themeSelect) {
            themeSelect.addEventListener("change", () => {
                const mode = localStorage.getItem("dh-mode") || "light";
                this.applyTheme(themeSelect.value, mode);
            });
        }

        if (modeToggle) {
            modeToggle.addEventListener("change", () => {
                const theme = localStorage.getItem("dh-theme") || "purple";
                this.applyTheme(
                    theme,
                    modeToggle.checked ? "dark" : "light"
                );
            });
        }
    }
};

// Make available to other JavaScript files
window.DeveloperHomes = DeveloperHomes;

// Start application
document.addEventListener("DOMContentLoaded", () => {
    DeveloperHomes.initTheme();
    DeveloperHomes.initNavigation();
    DeveloperHomes.initFooter();
    DeveloperHomes.initThemeControls();
});
