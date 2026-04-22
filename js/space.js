(function () {
    const boot = window.FrameShareAuthGateReady || Promise.resolve();
    boot.then(async () => {
        const store = window.FrameShareStore;
        const spaceTitle = document.getElementById("spaceTitle");
        const spaceDescription = document.getElementById("spaceDescription");
        const spaceOwner = document.getElementById("spaceOwner");
        const spaceMembers = document.getElementById("spaceMembers");
        const sharedMediaGrid = document.getElementById("sharedMediaGrid");
        const copyViewerLink = document.getElementById("copyViewerLink");
        const postIntoSpaceLink = document.getElementById("postIntoSpaceLink");

        const params = new URLSearchParams(location.search);
        const slug = params.get("space");
        const space = store.loadSpaces().find((item) => item.slug === slug) || store.getActiveSpace();

        if (!space) {
            sharedMediaGrid.innerHTML = '<article class="empty-state glow-card"><h3>Space not found</h3><p>Use a valid shared link or create a space first.</p></article>';
            return;
        }

        store.setActiveSpace(space.id);
        spaceTitle.textContent = space.name;
        spaceDescription.textContent = space.description || "Shared gallery";
        spaceOwner.textContent = `Owner: ${space.owner}`;
        spaceMembers.textContent = `${space.members.length} members`;
        postIntoSpaceLink.href = `post.html?space=${space.slug}`;

        copyViewerLink.addEventListener("click", async () => {
            const link = store.getShareLink(space);
            try {
                await navigator.clipboard.writeText(link);
                alert("Share link copied.");
            } catch {
                alert(link);
            }
        });

        if (!space.posts.length) {
            sharedMediaGrid.innerHTML = '<article class="empty-state glow-card"><h3>No media yet</h3><p>This space is ready for photos and videos.</p></article>';
            return;
        }

        const cards = await Promise.all(space.posts.map(async (post) => {
            const media = await store.getMediaRecord(post.id);
            return renderCard(post, media);
        }));
        sharedMediaGrid.innerHTML = cards.join("");

        function renderCard(post, media) {
            if (!media) {
                return "";
            }
            const objectUrl = URL.createObjectURL(media.file);
            const visual = post.type === "video"
                ? `<video src="${objectUrl}" controls preload="metadata"></video>`
                : `<img src="${objectUrl}" alt="${post.caption || "Shared upload"}">`;
            return `
                <article class="media-item glow-card">
                    <div class="media-frame">${visual}</div>
                    <div class="media-copy">
                        <div>
                            <strong>${post.caption || "Untitled post"}</strong>
                            <p class="media-author">Posted by ${post.author} • ${new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span class="media-type">${post.type === "video" ? "Video" : "Photo"}</span>
                    </div>
                </article>
            `;
        }
    });
})();
