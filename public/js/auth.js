
/* =========================================
   DEVELOPERHOMES - AUTHENTICATION
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const app = window.DeveloperHomes;

    if (!app) {
        console.error("DeveloperHomes application is not loaded.");
        return;
    }

    const message = document.getElementById("authMessage");

    // =====================================
    // PASSWORD VISIBILITY
    // =====================================

    const togglePassword = document.getElementById("togglePassword");

    if (togglePassword) {
        togglePassword.addEventListener("click", () => {
            const password = document.getElementById("password");

            if (!password) return;

            const show = password.type === "password";
            password.type = show ? "text" : "password";
            togglePassword.textContent = show ? "Hide" : "Show";
            togglePassword.setAttribute(
                "aria-label",
                show ? "Hide password" : "Show password"
            );
        });
    }

    // =====================================
    // LOGIN
    // =====================================

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async event => {
            event.preventDefault();

            app.clearMessage(message);

            const identifier = document
                .getElementById("identifier")
                .value.trim();

            const password = document
                .getElementById("password")
                .value;

            const loginButton = document.getElementById("loginButton");

            if (!identifier || !password) {
                app.showMessage(
                    message,
                    "Please enter your username/email and password.",
                    "error"
                );
                return;
            }

            loginButton.disabled = true;
            loginButton.textContent = "Signing in...";

            try {
                const result = await app.request("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ identifier, password })
                });

                app.showMessage(
                    message,
                    result.message || "Login successful!",
                    "success"
                );

                window.location.href = "/dashboard.html";

            } catch (error) {
                app.showMessage(message, error.message, "error");

            } finally {
                loginButton.disabled = false;
                loginButton.textContent = "Sign In";
            }
        });
    }

    // =====================================
    // REGISTRATION ELEMENTS
    // =====================================

    const registerForm = document.getElementById("registerForm");

    if (!registerForm) return;

    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");

    const usernameStatus = document.getElementById(
        "usernameAvailability"
    );

    const emailStatus = document.getElementById(
        "emailAvailability"
    );

    const registerButton = document.getElementById("registerButton");

    let usernameTimer;
    let emailTimer;

    let usernameCheckNumber = 0;
    let emailCheckNumber = 0;

    // =====================================
    // CHECK AVAILABILITY
    // =====================================

    async function checkAvailability(field, value, statusElement) {
        const cleanValue = value.trim();

        if (!cleanValue) {
            statusElement.textContent = "";
            return null;
        }

        const checkNumber = field === "username"
            ? ++usernameCheckNumber
            : ++emailCheckNumber;

        statusElement.textContent = "Checking...";
        statusElement.style.color = "gray";

        try {
            const query = new URLSearchParams({
                [field]: cleanValue
            });

            const result = await app.request(
                `/api/auth/check-availability?${query.toString()}`
            );

            // Ignore outdated responses
            const latestNumber = field === "username"
                ? usernameCheckNumber
                : emailCheckNumber;

            if (checkNumber !== latestNumber) return null;

            const status = result[field];

            if (!status) {
                statusElement.textContent = "Could not check availability.";
                statusElement.style.color = "gray";
                return null;
            }

            statusElement.textContent = status.message;
            statusElement.style.color = status.available
                ? "green"
                : "crimson";

            return status.available;

        } catch (error) {
            statusElement.textContent = "Check failed. Please try again.";
            statusElement.style.color = "crimson";
            return null;
        }
    }

    // =====================================
    // LIVE USERNAME CHECK
    // =====================================

    usernameInput.addEventListener("input", () => {
        clearTimeout(usernameTimer);
        usernameCheckNumber++;

        usernameStatus.textContent = "Waiting...";
        usernameStatus.style.color = "gray";

        usernameTimer = setTimeout(() => {
            checkAvailability(
                "username",
                usernameInput.value,
                usernameStatus
            );
        }, 500);
    });

    // =====================================
    // LIVE EMAIL CHECK
    // =====================================

    emailInput.addEventListener("input", () => {
        clearTimeout(emailTimer);
        emailCheckNumber++;

        emailStatus.textContent = "Waiting...";
        emailStatus.style.color = "gray";

        emailTimer = setTimeout(() => {
            checkAvailability(
                "email",
                emailInput.value,
                emailStatus
            );
        }, 500);
    });

    // =====================================
    // REGISTER
    // =====================================

    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        app.clearMessage(message);

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();

        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const acceptTerms = document.getElementById("acceptTerms");

        if (!username || !email || !password || !confirmPassword) {
            app.showMessage(
                message,
                "Please complete all required fields.",
                "error"
            );
            return;
        }

        if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
            app.showMessage(
                message,
                "Username must be 3–50 characters and contain only letters, numbers, and underscores.",
                "error"
            );
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            app.showMessage(
                message,
                "Please enter a valid email address.",
                "error"
            );
            return;
        }

        if (password.length < 8) {
            app.showMessage(
                message,
                "Password must contain at least 8 characters.",
                "error"
            );
            return;
        }

        if (password !== confirmPassword) {
            app.showMessage(
                message,
                "Passwords do not match.",
                "error"
            );
            return;
        }

        if (!acceptTerms.checked) {
            app.showMessage(
                message,
                "Please accept the terms before registering.",
                "error"
            );
            return;
        }

        registerButton.disabled = true;
        registerButton.textContent = "Checking availability...";

        try {
            const usernameAvailable = await checkAvailability(
                "username",
                username,
                usernameStatus
            );

            const emailAvailable = await checkAvailability(
                "email",
                email,
                emailStatus
            );

            if (usernameAvailable !== true || emailAvailable !== true) {
                app.showMessage(
                    message,
                    "Please use an available username and email address.",
                    "error"
                );
                return;
            }

            registerButton.textContent = "Creating account...";

            const result = await app.request("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            app.showMessage(
                message,
                result.message || "Account created successfully!",
                "success"
            );

            registerForm.reset();

            usernameStatus.textContent = "";
            emailStatus.textContent = "";

            setTimeout(() => {
                window.location.href = "/login.html";
            }, 1200);

        } catch (error) {
            app.showMessage(message, error.message, "error");

        } finally {
            registerButton.disabled = false;
            registerButton.textContent = "Create My Account →";
        }
    });

});
