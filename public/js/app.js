
"use strict";

const DeveloperHomes = {
    apiBase: "/api",

    async request(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
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

    async getCurrentUser() {
        try {
            const result = await this.request("/api/auth/me");
            return result.user || null;
        } catch {
            return null;
        }
    },

    async requireLogin() {
        const user = await this.getCurrentUser();

        if (!user) {
            window.location.href = "/login.html";
            return null;
        }

        return user;
    },

    showMessage(element, message, type = "info") {
        if (!element) return;
        element.textContent = message;
        element.className = `message ${type}`;
        element.hidden = false;
    },

    clearMessage(element) {
        if (!element) return;
        element.textContent = "";
        element.hidden = true;
    },

    formatDate(date) {
        if (!date) return "Unknown date";
        const value = new Date(date);
        if (Number.isNaN(value.getTime())) return "Unknown date";

        return value.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    },

    formatDateTime(date) {
        if (!date) return "Unknown date";
        const value = new Date(date);
        if (Number.isNaN(value.getTime())) return "Unknown date";
        return value.toLocaleString();
    },

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

    getInitials(name) {
        if (!name) return "DH";

        return String(name)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("");
    },

    setAvatar(element, name, imageUrl) {
        if (!element) return;

        if (imageUrl) {
            element.innerHTML = "";
            element.style.backgroundImage =
                `url("${String(imageUrl).replace(/["\\]/g, "")}")`;
            element.style.backgroundSize = "cover";
            element.style.backgroundPosition = "center";
            element.textContent = "";
        } else {
            element.style.backgroundImage = "none";
            element.textContent = this.getInitials(name);
        }
    },

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

    initTheme() {
        const savedTheme = localStorage.getItem("dh-theme") || "purple";
        const savedMode = localStorage.getItem("dh-mode") || "light";
        this.applyTheme(savedTheme, savedMode);
    },

    applyTheme(theme, mode) {
        const allowedThemes = ["purple", "blue", "green", "orange"];
        const allowedModes = ["light", "dark"];

        if (!allowedThemes.includes(theme)) theme = "purple";
        if (!allowedModes.includes(mode)) mode = "light";

        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.setAttribute("data-mode", mode);

        localStorage.setItem("dh-theme", theme);
        localStorage.setItem("dh-mode", mode);

        const themeSelect = document.getElementById("themeSelect");
        const modeToggle = document.getElementById("darkModeToggle");

        if (themeSelect) themeSelect.value = theme;
        if (modeToggle) modeToggle.checked = mode === "dark";
    },

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

    // Role-based homepage navigation
    async initRoleBasedNavigation() {
        const adminButton = document.getElementById("adminNavButton");
        const adminFeatureCard = document.getElementById("adminFeatureCard");

        const loginButton = document.getElementById("loginNavButton");
        const registerButton = document.getElementById("registerNavButton");
        const logoutButton = document.getElementById("logoutButton");

        // Hide privileged elements by default
        if (adminButton) adminButton.hidden = true;
        if (adminFeatureCard) adminFeatureCard.hidden = true;

        try {
            const user = await this.getCurrentUser();

            if (!user) {
                if (logoutButton) logoutButton.hidden = true;
                return;
            }

            // Logged-in users do not need Login/Register links
            if (loginButton) loginButton.hidden = true;
            if (registerButton) registerButton.hidden = true;
            if (logoutButton) logoutButton.hidden = false;

            const role = String(user.role || "").trim().toLowerCase();
            const canAccessAdmin = ["owner", "manager"].includes(role);

            if (adminButton) {
                adminButton.hidden = !canAccessAdmin;
            }

            if (adminFeatureCard) {
                adminFeatureCard.hidden = !canAccessAdmin;
            }

        } catch (error) {
            console.error("Navigation role check failed:", error.message);
        }
    },

    initFooter() {
        const year = document.getElementById("currentYear");
        if (year) year.textContent = new Date().getFullYear();
    },

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

window.DeveloperHomes = DeveloperHomes;

document.addEventListener("DOMContentLoaded", () => {
    DeveloperHomes.initTheme();
    DeveloperHomes.initNavigation();
    DeveloperHomes.initFooter();
    DeveloperHomes.initThemeControls();
    DeveloperHomes.initRoleBasedNavigation();
});
