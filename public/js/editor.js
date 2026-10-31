
/* =========================================
   DEVELOPERHOMES - CODE EDITOR
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const app = window.DeveloperHomes;

    if (!app) return;

    const user = await app.requireLogin();

    if (!user) return;

    const titleInput = document.getElementById("snippetTitle");
    const languageSelect = document.getElementById("editorLanguage");
    const codeEditor = document.getElementById("codeEditor");
    const lineNumbers = document.getElementById("lineNumbers");

    const copyButton = document.getElementById("copyCodeButton");
    const saveButton = document.getElementById("saveSnippetButton");

    const status = document.getElementById("editorStatus");
    const languageStatus = document.getElementById("editorLanguageStatus");
    const lineCount = document.getElementById("editorLineCount");
    const snippetsList = document.getElementById("snippetsList");

    const message = document.getElementById("editorMessage");

    if (!codeEditor || !saveButton) return;

    let snippets = [];
    let currentSnippetId = null;

    // Update editor information
    function updateEditorInfo() {

        const lines = codeEditor.value.split("\n").length;

        if (lineNumbers) {
            lineNumbers.textContent = Array.from(
                { length: lines },
                (_, index) => index + 1
            ).join("\n");
        }

        if (lineCount) {
            lineCount.textContent = `${lines} lines`;
        }

        if (languageStatus && languageSelect) {
            languageStatus.textContent = languageSelect.value.toUpperCase();
        }

        if (status) {
            status.textContent = "Ready";
        }
    }

    // Editor input events
    codeEditor.addEventListener("input", updateEditorInfo);

    if (languageSelect) {
        languageSelect.addEventListener("change", updateEditorInfo);
    }

    // Tab key inserts spaces
    codeEditor.addEventListener("keydown", event => {

        if (event.key === "Tab") {
            event.preventDefault();

            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;

            codeEditor.setRangeText(
                "    ",
                start,
                end,
                "end"
            );

            updateEditorInfo();
        }

        // Save shortcut: Ctrl + S
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            saveSnippet();
        }
    });

    // Copy code
    if (copyButton) {
        copyButton.addEventListener("click", async () => {

            try {
                await navigator.clipboard.writeText(codeEditor.value);

                copyButton.textContent = "Copied!";

                setTimeout(() => {
                    copyButton.textContent = "Copy Code";
                }, 1500);

            } catch {
                app.showMessage(
                    message,
                    "Unable to copy. Please select and copy the code manually.",
                    "error"
                );
            }
        });
    }

    // Load snippets from backend
    async function loadSnippets() {

        if (!snippetsList) return;

        try {
            const result = await app.request("/api/users/snippets");

            snippets = result.snippets || [];

            renderSnippets();

        } catch (error) {
            app.showMessage(
                message,
                error.message,
                "error"
            );
        }
    }

    // Display snippets
    function renderSnippets() {

        if (!snippetsList) return;

        if (!snippets.length) {
            snippetsList.innerHTML = `
                <div class="empty-state">
                    <p>No saved snippets yet.</p>
                </div>
            `;
            return;
        }

        snippetsList.innerHTML = snippets.map(snippet => `
            <div class="snippet-item"
                 data-id="${Number(snippet.id)}">

                <button type="button"
                        class="snippet-open"
                        data-action="open"
                        data-id="${Number(snippet.id)}">

                    <strong>${app.escapeHTML(snippet.title)}</strong>

                    <small>
                        ${app.escapeHTML(snippet.language || "text")}
                    </small>

                </button>

                <button type="button"
                        class="btn btn-danger btn-small"
                        data-action="delete"
                        data-id="${Number(snippet.id)}">
                    Delete
                </button>

            </div>
        `).join("");
    }

    // Save snippet
    async function saveSnippet() {

        const title = titleInput?.value.trim() || "";
        const language = languageSelect?.value || "javascript";
        const code = codeEditor.value;

        if (!title) {
            app.showMessage(
                message,
                "Please enter a snippet title.",
                "error"
            );
            titleInput?.focus();
            return;
        }

        if (!code.trim()) {
            app.showMessage(
                message,
                "Please enter some code before saving.",
                "error"
            );
            codeEditor.focus();
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {

            const result = await app.request(
                currentSnippetId
                    ? `/api/users/snippets/${currentSnippetId}`
                    : "/api/users/snippets",
                {
                    method: currentSnippetId ? "PUT" : "POST",
                    body: JSON.stringify({
                        title,
                        language,
                        code
                    })
                }
            );

            app.showMessage(
                message,
                result.message || "Snippet saved successfully!",
                "success"
            );

            if (result.snippet?.id) {
                currentSnippetId = result.snippet.id;
            }

            if (status) {
                status.textContent = "Saved";
            }

            await loadSnippets();

        } catch (error) {
            app.showMessage(
                message,
                error.message,
                "error"
            );

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Snippet";
        }
    }

    if (saveButton) {
        saveButton.addEventListener("click", saveSnippet);
    }

    // Open or delete a snippet
    if (snippetsList) {

        snippetsList.addEventListener("click", async event => {

            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const id = Number(button.dataset.id);
            const action = button.dataset.action;

            const snippet = snippets.find(
                item => Number(item.id) === id
            );

            if (!snippet) return;

            if (action === "open") {

                currentSnippetId = snippet.id;

                if (titleInput) {
                    titleInput.value = snippet.title || "";
                }

                if (languageSelect) {
                    languageSelect.value = snippet.language || "javascript";
                }

                codeEditor.value = snippet.code || "";

                updateEditorInfo();

                app.showMessage(
                    message,
                    `Opened "${snippet.title}".`,
                    "success"
                );

                return;
            }

            if (action === "delete") {

                if (!confirm(`Delete "${snippet.title}"?`)) {
                    return;
                }

                button.disabled = true;

                try {

                    const result = await app.request(
                        `/api/users/snippets/${id}`,
                        { method: "DELETE" }
                    );

                    if (Number(currentSnippetId) === id) {
                        currentSnippetId = null;

                        if (titleInput) titleInput.value = "";

                        codeEditor.value = "";

                        updateEditorInfo();
                    }

                    app.showMessage(
                        message,
                        result.message || "Snippet deleted.",
                        "success"
                    );

                    await loadSnippets();

                } catch (error) {
                    app.showMessage(
                        message,
                        error.message,
                        "error"
                    );

                    button.disabled = false;
                }
            }
        });
    }

    // Initial editor setup
    updateEditorInfo();

    await loadSnippets();

});
