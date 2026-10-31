
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

    // Show or hide password
    const togglePassword = document.getElementById("togglePassword");

    if (togglePassword) {
        togglePassword.addEventListener("click", () => {
            const password = document.getElementById("password");

            if (!password) return;

            const isPassword = password.type === "password";
            password.type = isPassword ? "text" : "password";

            togglePassword.textContent = isPassword ? "Hide" : "Show";
        });
    }

    // LOGIN
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
                    body: JSON.stringify({
                        identifier,
                        password
                    })
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

    // REGISTER
    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", async event => {
            event.preventDefault();

            app.clearMessage(message);

            const username = document
                .getElementById("username")
                .value.trim();

            const email = document
                .getElementById("email")
                .value.trim();

            const password = document
                .getElementById("password")
                .value;

            const confirmPassword = document
                .getElementById("confirmPassword")
                .value;

            const acceptTerms = document.getElementById("acceptTerms");

            const registerButton =
                document.getElementById("registerButton");

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

            if (acceptTerms && !acceptTerms.checked) {
                app.showMessage(
                    message,
                    "Please accept the terms before registering.",
                    "error"
                );
                return;
            }

            registerButton.disabled = true;
            registerButton.textContent = "Creating account...";

            try {
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
                    result.message || "Account created successfully! You can now sign in.",
                    "success"
                );

                registerForm.reset();

                setTimeout(() => {
                    window.location.href = "/login.html";
                }, 1200);

            } catch (error) {
                app.showMessage(message, error.message, "error");

            } finally {
                registerButton.disabled = false;
                registerButton.textContent = "Create Account";
            }
        });
    }

});
