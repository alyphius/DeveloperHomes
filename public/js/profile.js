
/* =========================================
   DEVELOPERHOMES - USER PROFILE
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const app = window.DeveloperHomes;

    if (!app) return;

    const user = await app.requireLogin();

    if (!user) return;

    const message = document.getElementById("profileMessage");

    const profileForm = document.getElementById("profileForm");

    const profileAvatar = document.getElementById("profileAvatar");
    const displayUsername = document.getElementById("displayUsername");
    const displayEmail = document.getElementById("displayEmail");
    const displayRole = document.getElementById("displayRole");
    const memberSince = document.getElementById("memberSince");

    const usernameInput = document.getElementById("profileUsername");
    const emailInput = document.getElementById("profileEmail");
    const bioInput = document.getElementById("profileBio");
    const imageInput = document.getElementById("profileImage");

    const accountRole = document.getElementById("accountRole");
    const accountEmail = document.getElementById("accountEmail");
    const accountUsername = document.getElementById("accountUsername");

    // Display profile information
    function displayProfile(profile) {

        if (displayUsername) {
            displayUsername.textContent = profile.username || "Developer";
        }

        if (displayEmail) {
            displayEmail.textContent = profile.email || "";
        }

        if (displayRole) {
            displayRole.textContent = profile.role || "user";
        }

        if (usernameInput) {
            usernameInput.value = profile.username || "";
        }

        if (emailInput) {
            emailInput.value = profile.email || "";
        }

        if (bioInput) {
            bioInput.value = profile.bio || "";
        }

        if (imageInput) {
            imageInput.value = profile.profile_image || "";
        }

        if (accountRole) {
            accountRole.textContent = profile.role || "user";
        }

        if (accountEmail) {
            accountEmail.textContent = profile.email || "";
        }

        if (accountUsername) {
            accountUsername.textContent = profile.username || "";
        }

        if (memberSince) {
            memberSince.textContent = app.formatDate(profile.created_at);
        }

        app.setAvatar(
            profileAvatar,
            profile.username,
            profile.profile_image
        );
    }

    // Load latest profile
    async function loadProfile() {

        try {

            const result = await app.request("/api/users/me");

            const profile = result.user || result;

            displayProfile(profile);

        } catch (error) {

            app.showMessage(
                message,
                "Unable to load profile: " + error.message,
                "error"
            );
        }
    }

    // Save profile
    if (profileForm) {

        profileForm.addEventListener("submit", async event => {

            event.preventDefault();

            const username = usernameInput.value.trim();
            const bio = bioInput.value.trim();
            const profile_image = imageInput.value.trim();

            if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {

                app.showMessage(
                    message,
                    "Username must be 3–50 characters and contain only letters, numbers, and underscores.",
                    "error"
                );

                return;
            }

            if (bio.length > 500) {

                app.showMessage(
                    message,
                    "Bio cannot exceed 500 characters.",
                    "error"
                );

                return;
            }

            if (profile_image) {

                try {

                    const imageURL = new URL(profile_image);

                    if (!["http:", "https:"].includes(imageURL.protocol)) {
                        throw new Error();
                    }

                } catch {

                    app.showMessage(
                        message,
                        "Please enter a valid HTTP or HTTPS image URL.",
                        "error"
                    );

                    return;
                }
            }

            const saveButton =
                document.getElementById("saveProfileButton");

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {

                const result = await app.request("/api/users/me", {
                    method: "PUT",
                    body: JSON.stringify({
                        username,
                        bio,
                        profile_image
                    })
                });

                const updatedUser = result.user || {
                    ...user,
                    username,
                    bio,
                    profile_image
                };

                displayProfile(updatedUser);

                app.showMessage(
                    message,
                    result.message || "Profile updated successfully!",
                    "success"
                );

            } catch (error) {

                app.showMessage(
                    message,
                    error.message,
                    "error"
                );

            } finally {

                saveButton.disabled = false;
                saveButton.textContent = "Save Changes";
            }
        });
    }

    // Reset profile form
    const resetButton = document.getElementById("resetProfileButton");

    if (resetButton) {

        resetButton.addEventListener("click", () => {

            if (usernameInput) {
                usernameInput.value = user.username || "";
            }

            if (emailInput) {
                emailInput.value = user.email || "";
            }

            if (bioInput) {
                bioInput.value = user.bio || "";
            }

            if (imageInput) {
                imageInput.value = user.profile_image || "";
            }

            app.clearMessage(message);
        });
    }

    await loadProfile();

});
