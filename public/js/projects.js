
/* =========================================
   DEVELOPERHOMES - PROJECT MANAGEMENT
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const app = window.DeveloperHomes;

    if (!app) return;

    const user = await app.requireLogin();

    if (!user) return;

    const message = document.getElementById("projectsMessage");

    const projectForm = document.getElementById("projectForm");
    const projectFormPanel = document.getElementById("projectFormPanel");
    const showProjectForm = document.getElementById("showProjectForm");
    const closeProjectForm = document.getElementById("closeProjectForm");
    const cancelProjectForm = document.getElementById("cancelProjectForm");

    const projectsGrid = document.getElementById("projectsGrid");
    const searchInput = document.getElementById("projectSearch");
    const languageFilter = document.getElementById("languageFilter");
    const categoryFilter = document.getElementById("categoryFilter");

    const projectId = document.getElementById("projectId");
    const projectTitle = document.getElementById("projectTitle");
    const projectDescription = document.getElementById("projectDescription");
    const projectLanguage = document.getElementById("projectLanguage");
    const projectCategory = document.getElementById("projectCategory");
    const projectUrl = document.getElementById("projectUrl");

    let projects = [];

    // Show project form
    function openForm(project = null) {

        if (!projectFormPanel) return;

        projectFormPanel.hidden = false;

        if (project) {
            document.getElementById("projectFormTitle").textContent =
                "Edit Project";

            projectId.value = project.id;
            projectTitle.value = project.title || "";
            projectDescription.value = project.description || "";
            projectLanguage.value = project.language || "";
            projectCategory.value = project.category || "";
            projectUrl.value = project.project_url || "";

        } else {
            document.getElementById("projectFormTitle").textContent =
                "Create New Project";

            projectForm.reset();
            projectId.value = "";
        }

        projectTitle.focus();
    }

    // Close project form
    function closeForm() {

        if (projectFormPanel) {
            projectFormPanel.hidden = true;
        }

        if (projectForm) {
            projectForm.reset();
        }

        if (projectId) {
            projectId.value = "";
        }
    }

    if (showProjectForm) {
        showProjectForm.addEventListener("click", () => openForm());
    }

    if (closeProjectForm) {
        closeProjectForm.addEventListener("click", closeForm);
    }

    if (cancelProjectForm) {
        cancelProjectForm.addEventListener("click", closeForm);
    }

    // Load projects
    async function loadProjects() {

        try {
            app.clearMessage(message);

            const result = await app.request("/api/projects");

            projects = result.projects || [];

            renderProjects();

        } catch (error) {
            app.showMessage(message, error.message, "error");
        }
    }

    // Render projects
    function renderProjects() {

        if (!projectsGrid) return;

        const search = (searchInput?.value || "").toLowerCase();
        const language = languageFilter?.value || "";
        const category = categoryFilter?.value || "";

        const filtered = projects.filter(project => {

            const matchesSearch =
                (project.title || "").toLowerCase().includes(search) ||
                (project.description || "").toLowerCase().includes(search) ||
                (project.language || "").toLowerCase().includes(search);

            const matchesLanguage =
                !language || project.language === language;

            const matchesCategory =
                !category || project.category === category;

            return matchesSearch && matchesLanguage && matchesCategory;
        });

        const resultsCount =
            document.getElementById("projectResultsCount");

        if (resultsCount) {
            resultsCount.textContent =
                `${filtered.length} project${filtered.length === 1 ? "" : "s"}`;
        }

        if (!filtered.length) {
            projectsGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No projects found</h3>
                    <p>Create a project or change your search filters.</p>
                </div>
            `;
            return;
        }

        projectsGrid.innerHTML = filtered.map(project => `

            <article class="project-card">

                <div class="project-card-header">
                    <span class="project-language">
                        ${app.escapeHTML(project.language || "Other")}
                    </span>

                    <span class="project-category">
                        ${app.escapeHTML(project.category || "General")}
                    </span>
                </div>

                <h3>${app.escapeHTML(project.title)}</h3>

                <p class="project-description">
                    ${app.escapeHTML(project.description || "No description provided.")}
                </p>

                <div class="project-meta">
                    <small>Created ${app.formatDate(project.created_at)}</small>
                </div>

                <div class="project-actions">

                    ${
                        project.project_url
                        ? `<a class="btn btn-outline btn-small"
                              href="${app.escapeHTML(project.project_url)}"
                              target="_blank"
                              rel="noopener noreferrer">
                              Open Project
                           </a>`
                        : ""
                    }

                    <button class="btn btn-outline btn-small"
                            data-action="edit"
                            data-id="${Number(project.id)}">
                        Edit
                    </button>

                    <button class="btn btn-danger btn-small"
                            data-action="delete"
                            data-id="${Number(project.id)}">
                        Delete
                    </button>

                </div>

            </article>

        `).join("");
    }

    // Create or update project
    if (projectForm) {

        projectForm.addEventListener("submit", async event => {

            event.preventDefault();

            const id = projectId.value;

            const data = {
                title: projectTitle.value.trim(),
                description: projectDescription.value.trim(),
                language: projectLanguage.value,
                category: projectCategory.value,
                project_url: projectUrl.value.trim()
            };

            if (!data.title) {
                app.showMessage(
                    message,
                    "Project title is required.",
                    "error"
                );
                return;
            }

            if (data.project_url) {
                try {
                    const url = new URL(data.project_url);

                    if (!["http:", "https:"].includes(url.protocol)) {
                        throw new Error();
                    }

                } catch {
                    app.showMessage(
                        message,
                        "Please enter a valid HTTP or HTTPS project URL.",
                        "error"
                    );
                    return;
                }
            }

            const saveButton =
                document.getElementById("saveProjectButton");

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {

                const result = await app.request(
                    id ? `/api/projects/${id}` : "/api/projects",
                    {
                        method: id ? "PUT" : "POST",
                        body: JSON.stringify(data)
                    }
                );

                app.showMessage(
                    message,
                    result.message || "Project saved successfully!",
                    "success"
                );

                closeForm();

                await loadProjects();

            } catch (error) {
                app.showMessage(message, error.message, "error");

            } finally {
                saveButton.disabled = false;
                saveButton.textContent = "Save Project";
            }
        });
    }

    // Edit and delete project buttons
    if (projectsGrid) {

        projectsGrid.addEventListener("click", async event => {

            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const id = Number(button.dataset.id);
            const action = button.dataset.action;

            const project = projects.find(item => Number(item.id) === id);

            if (!project) return;

            if (action === "edit") {
                openForm(project);
                return;
            }

            if (action === "delete") {

                const confirmed = confirm(
                    `Are you sure you want to delete "${project.title}"?`
                );

                if (!confirmed) return;

                button.disabled = true;

                try {

                    const result = await app.request(
                        `/api/projects/${id}`,
                        { method: "DELETE" }
                    );

                    app.showMessage(
                        message,
                        result.message || "Project deleted successfully.",
                        "success"
                    );

                    await loadProjects();

                } catch (error) {
                    app.showMessage(message, error.message, "error");
                    button.disabled = false;
                }
            }
        });
    }

    // Search and filters
    if (searchInput) {
        searchInput.addEventListener("input", renderProjects);
    }

    if (languageFilter) {
        languageFilter.addEventListener("change", renderProjects);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener("change", renderProjects);
    }

    // Empty state create button
    const emptyCreateProject =
        document.getElementById("emptyCreateProject");

    if (emptyCreateProject) {
        emptyCreateProject.addEventListener("click", () => openForm());
    }

    await loadProjects();

});
