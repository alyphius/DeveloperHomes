
/* =========================================
   DEVELOPERHOMES - COMMUNITY
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", async () => {

    const app = window.DeveloperHomes;

    if (!app) return;

    const user = await app.requireLogin();

    if (!user) return;

    const postForm = document.getElementById("postForm");
    const postContent = document.getElementById("postContent");
    const postsContainer = document.getElementById("postsContainer");
    const characterCount = document.getElementById("postCharacterCount");
    const publishButton = document.getElementById("publishPostButton");
    const refreshButton = document.getElementById("refreshPostsButton");
    const message = document.getElementById("communityMessage");

    let posts = [];

    // Character counter
    function updateCharacterCount() {

        if (!postContent || !characterCount) return;

        const length = postContent.value.length;

        characterCount.textContent = `${length}/5000`;

        if (length > 5000) {
            characterCount.classList.add("text-danger");
        } else {
            characterCount.classList.remove("text-danger");
        }
    }

    if (postContent) {
        postContent.addEventListener("input", updateCharacterCount);
    }

    // Load community posts
    async function loadPosts() {

        if (!postsContainer) return;

        try {

            app.clearMessage(message);

            postsContainer.innerHTML = `
                <div class="loading-state">
                    Loading community posts...
                </div>
            `;

            const result = await app.request("/api/posts");

            posts = result.posts || [];

            renderPosts();

        } catch (error) {

            postsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Unable to load posts.</p>
                </div>
            `;

            app.showMessage(message, error.message, "error");
        }
    }

    // Render post feed
    function renderPosts() {

        if (!postsContainer) return;

        if (!posts.length) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No community posts yet</h3>
                    <p>Be the first developer to share something!</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = posts.map(post => {

            const liked = Number(post.liked_by_me) === 1;
            const isOwner = Number(post.user_id) === Number(user.id);

            return `

                <article class="post-card" data-post-id="${Number(post.id)}">

                    <div class="post-header">

                        <div class="post-author">

                            <div class="avatar">
                                ${
                                    post.profile_image
                                    ? `<img src="${app.escapeHTML(post.profile_image)}"
                                            alt="Profile photo">`
                                    : app.escapeHTML(app.getInitials(post.username))
                                }
                            </div>

                            <div>
                                <strong>${app.escapeHTML(post.username)}</strong>
                                <small>${app.formatDateTime(post.created_at)}</small>
                            </div>

                        </div>

                        ${
                            isOwner
                            ? `<button type="button"
                                       class="btn btn-danger btn-small"
                                       data-action="delete">
                                   Delete
                               </button>`
                            : ""
                        }

                    </div>

                    <div class="post-content">
                        <p>${app.escapeHTML(post.content)}</p>
                    </div>

                    <div class="post-stats">
                        <span>${Number(post.likes_count || 0)} likes</span>
                        <span>${Number(post.comments_count || 0)} comments</span>
                    </div>

                    <div class="post-actions">

                        <button type="button"
                                class="btn btn-outline btn-small ${liked ? "active" : ""}"
                                data-action="like">
                            ${liked ? "♥ Liked" : "♡ Like"}
                        </button>

                        <button type="button"
                                class="btn btn-outline btn-small"
                                data-action="comments">
                            Comments
                        </button>

                    </div>

                    <div class="comments-section" hidden>

                        <div class="comments-list">
                            Loading comments...
                        </div>

                        <form class="comment-form">

                            <input type="text"
                                   name="content"
                                   placeholder="Write a comment..."
                                   maxlength="2000"
                                   required>

                            <button type="submit" class="btn btn-primary btn-small">
                                Send
                            </button>

                        </form>

                    </div>

                </article>

            `;

        }).join("");
    }

    // Publish a post
    if (postForm) {

        postForm.addEventListener("submit", async event => {

            event.preventDefault();

            const content = postContent.value.trim();

            if (!content) {
                app.showMessage(
                    message,
                    "Please write something before publishing.",
                    "error"
                );
                return;
            }

            if (content.length > 5000) {
                app.showMessage(
                    message,
                    "Your post cannot exceed 5000 characters.",
                    "error"
                );
                return;
            }

            publishButton.disabled = true;
            publishButton.textContent = "Publishing...";

            try {

                const result = await app.request("/api/posts", {
                    method: "POST",
                    body: JSON.stringify({ content })
                });

                postForm.reset();
                updateCharacterCount();

                app.showMessage(
                    message,
                    result.message || "Your post was published!",
                    "success"
                );

                await loadPosts();

            } catch (error) {

                app.showMessage(message, error.message, "error");

            } finally {

                publishButton.disabled = false;
                publishButton.textContent = "Publish Post";
            }
        });
    }

    // Load comments for a post
    async function loadComments(postId, postCard) {

        const commentsList = postCard.querySelector(".comments-list");

        if (!commentsList) return;

        try {

            const result = await app.request(
                `/api/posts/${postId}/comments`
            );

            const comments = result.comments || [];

            if (!comments.length) {
                commentsList.innerHTML = `
                    <p class="empty-comments">No comments yet.</p>
                `;
                return;
            }

            commentsList.innerHTML = comments.map(comment => `
                <div class="comment-item">

                    <strong>${app.escapeHTML(comment.username)}</strong>

                    <p>${app.escapeHTML(comment.content)}</p>

                    <small>${app.formatDateTime(comment.created_at)}</small>

                </div>
            `).join("");

        } catch (error) {

            commentsList.textContent = error.message;
        }
    }

    // Post actions
    if (postsContainer) {

        postsContainer.addEventListener("click", async event => {

            const button = event.target.closest("button[data-action]");

            if (!button) return;

            const postCard = button.closest("[data-post-id]");

            if (!postCard) return;

            const postId = Number(postCard.dataset.postId);
            const action = button.dataset.action;

            // Like / unlike
            if (action === "like") {

                button.disabled = true;

                try {

                    await app.request(`/api/posts/${postId}/like`, {
                        method: "POST"
                    });

                    await loadPosts();

                } catch (error) {

                    app.showMessage(message, error.message, "error");
                    button.disabled = false;
                }

                return;
            }

            // Show comments
            if (action === "comments") {

                const section = postCard.querySelector(".comments-section");

                if (!section) return;

                section.hidden = !section.hidden;

                if (!section.hidden) {
                    await loadComments(postId, postCard);
                }

                return;
            }

            // Delete own post
            if (action === "delete") {

                if (!confirm("Are you sure you want to delete this post?")) {
                    return;
                }

                button.disabled = true;

                try {

                    const result = await app.request(
                        `/api/posts/${postId}`,
                        { method: "DELETE" }
                    );

                    app.showMessage(
                        message,
                        result.message || "Post deleted successfully.",
                        "success"
                    );

                    await loadPosts();

                } catch (error) {

                    app.showMessage(message, error.message, "error");
                    button.disabled = false;
                }
            }
        });

        // Submit comments
        postsContainer.addEventListener("submit", async event => {

            if (!event.target.matches(".comment-form")) return;

            event.preventDefault();

            const form = event.target;
            const postCard = form.closest("[data-post-id]");

            const postId = Number(postCard.dataset.postId);
            const input = form.querySelector('input[name="content"]');

            const content = input.value.trim();

            if (!content) return;

            const submitButton = form.querySelector("button");

            submitButton.disabled = true;

            try {

                await app.request(
                    `/api/posts/${postId}/comments`,
                    {
                        method: "POST",
                        body: JSON.stringify({ content })
                    }
                );

                input.value = "";

                await loadComments(postId, postCard);

            } catch (error) {

                app.showMessage(message, error.message, "error");

            } finally {

                submitButton.disabled = false;
            }
        });
    }

    // Refresh feed
    if (refreshButton) {
        refreshButton.addEventListener("click", loadPosts);
    }

    updateCharacterCount();

    await loadPosts();

});
