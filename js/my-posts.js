(function () {
    const boot = window.FrameShareAuthGateReady || Promise.resolve();
    boot.then(async () => {
        const store = window.FrameShareStore;
        const authorName = document.getElementById("authorName");
        const authorMeta = document.getElementById("authorMeta");
        const myPostsGrid = document.getElementById("myPostsGrid");

        const authUser = store.getAuthUser();
        const currentUser = store.getCurrentUser();
        const author = currentUser?.name || authUser?.name;

        if (!author) {
            myPostsGrid.innerHTML = '<article class="empty-state glow-card"><h3>No posts yet</h3><p>Log in, join a space, and upload something first.</p></article>';
            return;
        }

        await renderPosts(author);
        myPostsGrid.addEventListener("click", async (event) => {
            const deleteButton = event.target.closest("[data-delete-post]");
            if (!deleteButton) {
                return;
            }
            const postId = deleteButton.dataset.deletePost;
            const confirmed = confirm("Delete this post permanently from your saved gallery?");
            if (!confirmed) {
                return;
            }
            await store.deletePost(postId, author);
            await renderPosts(author);
        });

        async function renderPosts(activeAuthor) {
            const posts = store.getPostsByAuthor(activeAuthor);
            authorName.textContent = activeAuthor;
            authorMeta.textContent = `${posts.length} total uploads`;

            if (!posts.length) {
                myPostsGrid.innerHTML = '<article class="empty-state glow-card"><h3>No uploads yet</h3><p>Your posts will appear here once you upload from the posting page.</p></article>';
                return;
            }

            const cards = await Promise.all(posts.map(async (post) => {
                const media = await store.getMediaRecord(post.id);
                return renderCard(post, media);
            }));
            myPostsGrid.innerHTML = cards.join("");
        }

        function renderCard(post, media) {
            if (!media) {
                return "";
            }
            const objectUrl = URL.createObjectURL(media.file);
            const visual = post.type === "video"
                ? `<video src="${objectUrl}" controls preload="metadata"></video>`
                : `<img src="${objectUrl}" alt="${post.caption || "My upload"}">`;
            return `
                <article class="media-item glow-card">
                    <div class="media-frame">${visual}</div>
                    <div class="media-copy">
                        <div>
                            <strong>${post.caption || "Untitled post"}</strong>
                            <p class="media-author">${post.spaceName} • ${new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div class="post-actions">
                            <a class="media-type" href="space.html?space=${post.spaceSlug}">Open Space</a>
                            <button class="danger-btn" type="button" data-delete-post="${post.id}">Delete</button>
                        </div>
                    </div>
                </article>
            `;
        }
    });
})();
