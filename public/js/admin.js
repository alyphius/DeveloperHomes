
/* =========================================
   DEVELOPERHOMES - ADMIN PANEL
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const app = window.DeveloperHomes;

    if (!app) {
        console.error("DeveloperHomes application is not loaded.");
        return;
    }

    const message = document.getElementById("adminMessage");

    // =====================================
    // AUTHENTICATION AND ROLE CHECK
    // =====================================

    const user = await app.requireLogin();

    if (!user) return;

    if (!["owner", "manager"].includes(user.role)) {
        window.location.href = "/dashboard.html";
        return;
    }

    const isOwner = user.role === "owner";

    const roleBadge = document.getElementById("adminRoleBadge");
    const usersTableBody = document.getElementById("usersTableBody");
    const userSearch = document.getElementById("userSearch");
    const roleFilter = document.getElementById("roleFilter");

    let users = [];

    if (roleBadge) {
        roleBadge.textContent = user.role.toUpperCase();
    }

    // =====================================
    // LOAD STATISTICS
    // =====================================

    async function loadStats() {
        try {
            const result = await app.request("/api/admin/stats");
            const stats = result.stats || result;

            document.getElementById("totalUsers").textContent =
                stats.users ?? 0;

            document.getElementById("totalProjects").textContent =
                stats.projects ?? 0;

            document.getElementById("totalPosts").textContent =
                stats.posts ?? 0;

            document.getElementById("totalSnippets").textContent =
                stats.snippets ?? 0;

        } catch (error) {
            app.showMessage(
                message,
                "Unable to load statistics: " + error.message,
                "error"
            );
        }
    }

    // =====================================
    // LOAD USERS
    // =====================================

    async function loadUsers() {
        try {
            const result = await app.request("/api/admin/users");

            users = result.users || [];

            renderUsers();

        } catch (error) {
            app.showMessage(
                message,
                "Unable to load users: " + error.message,
                "error"
            );
        }
    }

    // =====================================
    // RENDER USERS
    // =====================================

    function renderUsers() {
        if (!usersTableBody) return;

        const search = (userSearch?.value || "").toLowerCase();
        const selectedRole = roleFilter?.value || "";

        const filteredUsers = users.filter(item => {

            const matchesSearch =
                (item.username || "").toLowerCase().includes(search) ||
                (item.email || "").toLowerCase().includes(search);

            const matchesRole =
                !selectedRole || item.role === selectedRole;

            return matchesSearch && matchesRole;
        });

        const resultsCount =
            document.getElementById("usersResultsCount");

        if (resultsCount) {
            resultsCount.textContent =
                `${filteredUsers.length} users found`;
        }

        if (!filteredUsers.length) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="6">No users found.</td>
                </tr>
            `;
            return;
        }

        usersTableBody.innerHTML = filteredUsers.map(item => {

            const id = Number(item.id);

            const isCurrentUser =
                id === Number(user.id);

            const roleControl = isOwner
                ? `
                    <select class="user-role-select"
                            data-action="role"
                            data-id="${id}"
                            aria-label="Change role for ${app.escapeHTML(item.username)}"
                            ${isCurrentUser ? "disabled" : ""}>

                        <option value="user"
                            ${item.role === "user" ? "selected" : ""}>
                            User
                        </option>

                        <option value="manager"
                            ${item.role === "manager" ? "selected" : ""}>
                            Manager
                        </option>

                        <option value="owner"
                            ${item.role === "owner" ? "selected" : ""}>
                            Owner
                        </option>

                    </select>
                `
                : `<span class="role-badge">${app.escapeHTML(item.role)}</span>`;

            const deleteButton = isOwner
                ? `
                    <button type="button"
                            class="btn btn-danger btn-small"
                            data-action="delete"
                            data-id="${id}"
                            ${isCurrentUser ? "disabled" : ""}>
                        Delete
                    </button>
                `
                : "";

            return `
                <tr>
                    <td>${id}</td>

                    <td>
                        <strong>${app.escapeHTML(item.username)}</strong>
                        ${isCurrentUser ? "<small> (You)</small>" : ""}
                    </td>

                    <td>${app.escapeHTML(item.email)}</td>

                    <td>${app.escapeHTML(item.role)}</td>

                    <td>${app.formatDate(item.created_at)}</td>

                    <td>
                        <div class="admin-user-actions">
                            ${roleControl}
                            ${deleteButton}
                        </div>
                    </td>
                </tr>
            `;

        }).join("");
    }

    // =====================================
    // OWNER: MANAGER CREATION
    // =====================================

    const managerPanel =
        document.getElementById("managerCreationPanel");

    const managerForm =
        document.getElementById("managerForm");

    const managerMessage =
        document.getElementById("managerMessage");

    const managerUsername =
        document.getElementById("managerUsername");

    const managerEmail =
        document.getElementById("managerEmail");

    const managerPassword =
        document.getElementById("managerPassword");

    const managerUsernameStatus =
        document.getElementById("managerUsernameAvailability");

    const managerEmailStatus =
        document.getElementById("managerEmailAvailability");

    const createManagerButton =
        document.getElementById("createManagerButton");

    if (managerPanel) {
        managerPanel.hidden = !isOwner;
    }

    let usernameTimer;
    let emailTimer;
    let usernameCheckNumber = 0;
    let emailCheckNumber = 0;

    async function checkManagerAvailability(field, value, statusElement) {

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
            statusElement.textContent = "Availability check failed.";
            statusElement.style.color = "crimson";
            return null;
        }
    }

    if (isOwner && managerUsername && managerUsernameStatus) {
        managerUsername.addEventListener("input", () => {
            clearTimeout(usernameTimer);
            usernameCheckNumber++;

            managerUsernameStatus.textContent = "Waiting...";
            managerUsernameStatus.style.color = "gray";

            usernameTimer = setTimeout(() => {
                checkManagerAvailability(
                    "username",
                    managerUsername.value,
                    managerUsernameStatus
                );
            }, 500);
        });
    }

    if (isOwner && managerEmail && managerEmailStatus) {
        managerEmail.addEventListener("input", () => {
            clearTimeout(emailTimer);
            emailCheckNumber++;

            managerEmailStatus.textContent = "Waiting...";
            managerEmailStatus.style.color = "gray";

            emailTimer = setTimeout(() => {
                checkManagerAvailability(
                    "email",
                    managerEmail.value,
                    managerEmailStatus
                );
            }, 500);
        });
    }

    if (isOwner && managerForm) {
        managerForm.addEventListener("submit", async event => {
            event.preventDefault();

            app.clearMessage(managerMessage);

            const username = managerUsername.value.trim();
            const email = managerEmail.value.trim().toLowerCase();
            const password = managerPassword.value;

            if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
                app.showMessage(
                    managerMessage,
                    "Username must contain 3–50 letters, numbers, or underscores.",
                    "error"
                );
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                app.showMessage(
                    managerMessage,
                    "Please enter a valid email address.",
                    "error"
                );
                return;
            }

            if (password.length < 8) {
                app.showMessage(
                    managerMessage,
                    "Password must contain at least 8 characters.",
                    "error"
                );
                return;
            }

            createManagerButton.disabled = true;
            createManagerButton.textContent = "Checking...";

            try {
                const usernameAvailable =
                    await checkManagerAvailability(
                        "username",
                        username,
                        managerUsernameStatus
                    );

                const emailAvailable =
                    await checkManagerAvailability(
                        "email",
                        email,
                        managerEmailStatus
                    );

                if (
                    usernameAvailable !== true ||
                    emailAvailable !== true
                ) {
                    app.showMessage(
                        managerMessage,
                        "Please choose an available username and email.",
                        "error"
                    );
                    return;
                }

                createManagerButton.textContent = "Creating manager...";

                const result = await app.request(
                    "/api/admin/managers",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            username,
                            email,
                            password
                        })
                    }
                );

                app.showMessage(
                    managerMessage,
                    result.message || "Manager created successfully.",
                    "success"
                );

                managerForm.reset();

                managerUsernameStatus.textContent = "";
                managerEmailStatus.textContent = "";

                await Promise.all([
                    loadUsers(),
                    loadStats()
                ]);

            } catch (error) {
                app.showMessage(
                    managerMessage,
                    error.message || "Could not create manager.",
                    "error"
                );

            } finally {
                createManagerButton.disabled = false;
                createManagerButton.textContent = "Create Manager";
            }
        });
    }

    // =====================================
    // OWNER: CHANGE USER ROLE
    // =====================================

    if (usersTableBody) {

        usersTableBody.addEventListener("change", async event => {

            const select = event.target.closest(
                'select[data-action="role"]'
            );

            if (!select || !isOwner) return;

            const id = Number(select.dataset.id);
            const newRole = select.value;

            const selectedUser = users.find(
                item => Number(item.id) === id
            );

            if (!selectedUser) return;

            const previousRole = selectedUser.role;

            if (newRole === previousRole) return;

            const confirmed = confirm(
                `Change ${selectedUser.username}'s role from ${previousRole} to ${newRole}?`
            );

            if (!confirmed) {
                select.value = previousRole;
                return;
            }

            select.disabled = true;

            try {
                const result = await app.request(
                    `/api/admin/users/${id}/role`,
                    {
                        method: "PUT",
                        body: JSON.stringify({ role: newRole })
                    }
                );

                app.showMessage(
                    message,
                    result.message || "User role updated successfully.",
                    "success"
                );

                await loadUsers();

            } catch (error) {
                app.showMessage(message, error.message, "error");
                select.value = previousRole;
                select.disabled = false;
            }
        });

        // =====================================
        // OWNER: DELETE USER
        // =====================================

        usersTableBody.addEventListener("click", async event => {

            const button = event.target.closest(
                'button[data-action="delete"]'
            );

            if (!button || !isOwner) return;

            const id = Number(button.dataset.id);

            const selectedUser = users.find(
                item => Number(item.id) === id
            );

            if (!selectedUser) return;

            const confirmed = confirm(
                `Permanently delete ${selectedUser.username} and their associated data?`
            );

            if (!confirmed) return;

            button.disabled = true;

            try {
                const result = await app.request(
                    `/api/admin/users/${id}`,
                    { method: "DELETE" }
                );

                app.showMessage(
                    message,
                    result.message || "User deleted successfully.",
                    "success"
                );

                await Promise.all([
                    loadUsers(),
                    loadStats()
                ]);

            } catch (error) {
                app.showMessage(message, error.message, "error");
                button.disabled = false;
            }
        });
    }

    // =====================================
    // SEARCH AND FILTER
    // =====================================

    if (userSearch) {
        userSearch.addEventListener("input", renderUsers);
    }

    if (roleFilter) {
        roleFilter.addEventListener("change", renderUsers);
    }

    // =====================================
    // REFRESH
    // =====================================

    const refreshButton =
        document.getElementById("refreshUsersButton");

    if (refreshButton) {
        refreshButton.addEventListener("click", async () => {

            refreshButton.disabled = true;

            try {
                await Promise.all([
                    loadStats(),
                    loadUsers()
                ]);
            } finally {
                refreshButton.disabled = false;
            }
        });
    }

    // =====================================
    // INITIAL LOAD
    // =====================================

    await Promise.all([
        loadStats(),
        loadUsers()
    ]);

});
