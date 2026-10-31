
document.addEventListener("DOMContentLoaded", async () => {
    const app = window.DeveloperHomes;

    const user = await app.requireLogin();
    if (!user) return;

    // Display user information
    document.getElementById("dashboardUsername").textContent =
        user.username || "Developer";

    document.getElementById("profileUsername").textContent =
        user.username || "Developer";

    document.getElementById("profileEmail").textContent =
        user.email || "";

    document.getElementById("profileRole").textContent =
        user.role || "user";

    app.setAvatar(
        document.getElementById("profileAvatar"),
        user.username,
        user.profile_image
    );

    // Load dashboard information
    async function loadDashboard() {
        try {
            const [
                projectsResult,
                postsResult,
                notificationsResult,
                snippetsResult
            ] = await Promise.all([
                app.request("/api/projects"),
                app.request("/api/posts"),
                app.request("/api/posts/notifications"),
                app.request("/api/users/snippets")
            ]);

            const projects = projectsResult.projects || [];
            const posts = postsResult.posts || [];
            const notifications =
                notificationsResult.notifications || [];
            const snippets = snippetsResult.snippets || [];

            // Update statistics
            document.getElementById("projectCount").textContent =
                projects.length;

            document.getElementById("snippetCount").textContent =
                snippets.length;

            document.getElementById("postCount").textContent =
                posts.filter(post => Number(post.user_id) === Number(user.id))
                    .length;

            document.getElementById("notificationCount").textContent =
                notifications.filter(notification =>
                    Number(notification.is_read) === 0
                ).length;

            // Recent projects
            const recentProjects =
                document.getElementById("recentProjects");

            if (projects.length === 0) {
                recentProjects.innerHTML =
                    "<p>You have not created any projects yet.</p>";
            } else {
                recentProjects.innerHTML = projects
                    .slice(0, 5)
                    .map(project => `
                        <div class="recent-item">
                            <div>
                                <h4>${app.escapeHTML(project.title)}</h4>
                                <p>${app.escapeHTML(project.language || "Not specified")}</p>
                            </div>
                            <a href="/projects.html">View</a>
                        </div>
                    `).join("");
            }

            // Recent notifications
            const recentNotifications =
                document.getElementById("recentNotifications");

            if (notifications.length === 0) {
                recentNotifications.innerHTML =
                    "<p>No notifications yet.</p>";
            } else {
                recentNotifications.innerHTML = notifications
                    .slice(0, 5)
                    .map(notification => `
                        <div class="recent-item">
                            <div>
                                <p>${app.escapeHTML(notification.message)}</p>
                                <small>${app.formatDateTime(notification.created_at)}</small>
                            </div>
                        </div>
                    `).join("");
            }

        } catch (error) {
            console.error("Dashboard loading error:", error);

            app.showMessage(
                document.getElementById("dashboardMessage"),
                error.message || "Unable to load dashboard information.",
                "error"
            );
        }
    }

    await loadDashboard();
});
