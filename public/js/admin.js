
/* =========================================
   DEVELOPERHOMES - ADMIN PANEL
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const app = window.DeveloperHomes;

    if (!app) return;

    const message = document.getElementById("adminMessage");

    // Check authentication and permissions
    const user = await app.requireLogin();

    if (!user) return;

    if (!["owner", "manager"].includes(user.role)) {
        window.location.href = "/dashboard.html";
        return;
    }

    const roleBadge = document.getElementById("adminRoleBadge");
    const usersTableBody = document.getElementById("usersTableBody");

    const userSearch = document.getElementById("userSearch");
    const roleFilter = document.getElementById("roleFilter");

    let users = [];

    const isOwner = user.role === "owner";

    if (roleBadge) {
        roleBadge.textContent = user.role.toUpperCase();
    }

    // Load admin statistics
    async function loadStats() {

        try {

            const result = await app.request("/api/admin/stats");

            const stats = result.stats || result;

            const totalUsers = document.getElementById("totalUsers");
            const totalProjects = document.getElementById("totalProjects");
            const totalPosts = document.getElementById("totalPosts");
            const totalSnippets = document.getElementById("totalSnippets");

            if (totalUsers) {
                totalUsers.textContent = stats.users ?? 0;
            }

            if (totalProjects) {
                totalProjects.textContent = stats.projects ?? 0;
            }

            if (totalPosts) {
                totalPosts.textContent = stats.posts ?? 0;
            }

            if (totalSnippets) {
                totalSnippets.textContent = stats.code_snippets ?? 0;
            }

        } catch (error) {

            app.showMessage(
                message,
                "Unable to load statistics: " + error.message,
                "error"
            );
        }
    }

    // Load users
    async function loadUsers() {

        try {

            app.clearMessage(message);

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

    // Render users table
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
                `${filteredUsers.length} users`;
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

            const isCurrentUser =
                Number(item.id) === Number(user.id);

            const roleControl = isOwner
                ? `
                    <select class="user-role-select"
                            data-action="role"
                            data-id="${Number(item.id)}"
                            ${isCurrentUser ? "disabled" : ""}>

                        <option value="user" ${item.role === "user" ? "selected" : ""}>
                            User
                        </option>

                        <option value="manager" ${item.role === "manager" ? "selected" : ""}>
                            Manager
                        </option>

                        <option value="owner" ${item.role === "owner" ? "selected" : ""}>
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
                            data-id="${Number(item.id)}"
                            ${isCurrentUser ? "disabled" : ""}>
                        Delete
                    </button>
                `
                : "";

            return `

                <tr>

                    <td>${Number(item.id)}</td>

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

    // Change user role
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

        // Delete user
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

    // Search and role filtering
    if (userSearch) {
        userSearch.addEventListener("input", renderUsers);
    }

    if (roleFilter) {
        roleFilter.addEventListener("change", renderUsers);
    }

    // Refresh button
    const refreshButton =
        document.getElementById("refreshUsersButton");

    if (refreshButton) {

        refreshButton.addEventListener("click", async () => {

            refreshButton.disabled = true;

            await Promise.all([
                loadStats(),
                loadUsers()
            ]);

            refreshButton.disabled = false;
        });
    }

    await Promise.all([
        loadStats(),
        loadUsers()
    ]);

});
