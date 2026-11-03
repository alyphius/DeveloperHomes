
/* =========================================
   DEVELOPERHOMES - MAIN APPLICATION
   ========================================= */

"use strict";

const DeveloperHomes = {
    apiBase: "/api",
    currentUser: null,

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
            const result = await this.request("/api/auth/me", {
                method: "GET",
                cache: "no-store"
            });

            return result.user || null;
        } catch {
            return null;
        }
    },

    async requireLogin() {
        const user = await this.getCurrentUser();

        if (!user) {
            window.location.replace("/auth.html");
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

        if (Number.isNaN(value.getTime())) {
            return "Unknown date";
        }

        return value.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    },

    formatDateTime(date) {
        if (!date) return "Unknown date";

        const value = new Date(date);

        if (Number.isNaN(value.getTime())) {
            return "Unknown date";
        }

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

    // Update navigation based on the logged-in role
    async initAuthNavigation() {
        const user = await this.getCurrentUser();
        this.currentUser = user;

        const navActions = document.getElementById("navActions");

        // Admin controls stay hidden unless an authorized session exists.
        const adminButton = document.getElementById("homeAdminButton");
        const adminCard = document.getElementById("adminFeatureCard");

        const role = String(user?.role || "").toLowerCase();
        const isAdmin = role === "owner" || role === "manager";

        if (adminButton) {
            adminButton.hidden = !isAdmin;
        }

        if (adminCard) {
            adminCard.hidden = !isAdmin;
        }

        if (!navActions) return;

        if (!user) {
            navActions.innerHTML = `
                <a href="/auth.html" class="btn btn-outline">Login</a>
                <a href="/register.html" class="btn btn-primary">Get Started</a>
            `;
            return;
        }

        navActions.innerHTML = `
            ${isAdmin ? `
                <a href="/admin.html"
                   class="btn btn-primary"
                   id="homeAdminButton">
                    Admin
                </a>
            ` : ""}
            <a href="/dashboard.html" class="btn btn-outline">
                Dashboard
            </a>
            <button type="button"
                    id="logoutButton"
                    class="btn btn-primary">
                Logout
            </button>
        `;
    },

    async logout() {
        try {
            await this.request("/api/auth/logout", {
                method: "POST"
            });

            // Prevent cached protected pages from being reused.
            window.location.replace("/auth.html");

        } catch (error) {
            console.error("Logout error:", error.message);
            alert("Logout failed. Please try again.");
        }
    },

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

        // Event delegation also handles dynamically created logout buttons.
        document.addEventListener("click", event => {
            const button = event.target.closest("#logoutButton");

            if (button) {
                event.preventDefault();
                this.logout();
            }
        });
    },

    initFooter() {
        const year = document.getElementById("currentYear");

        if (year) {
            year.textContent = new Date().getFullYear();
        }
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

document.addEventListener("DOMContentLoaded", async () => {
    DeveloperHomes.initTheme();
    DeveloperHomes.initNavigation();
    DeveloperHomes.initFooter();
    DeveloperHomes.initThemeControls();

    await DeveloperHomes.initAuthNavigation();
});
