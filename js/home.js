(function () {
    const boot = window.FrameShareAuthGateReady || Promise.resolve();
    boot.then(() => {
        const store = window.FrameShareStore;
        const totalSpaces = document.getElementById("totalSpaces");
        const totalMembers = document.getElementById("totalMembers");
        const totalPosts = document.getElementById("totalPosts");
        const spaceGrid = document.getElementById("spaceGrid");
        const heroSpaceName = document.getElementById("heroSpaceName");
        const heroShareLink = document.getElementById("heroShareLink");
        const copyHeroLink = document.getElementById("copyHeroLink");
        const seedDemoBtn = document.getElementById("seedDemoBtn");

        render();

        seedDemoBtn.addEventListener("click", async () => {
            await store.seedDemoContent();
            render();
            alert("Demo space added.");
        });

        copyHeroLink.addEventListener("click", async () => {
            const active = store.getActiveSpace();
            if (!active) {
                alert("No space available yet.");
                return;
            }
            const link = store.getShareLink(active);
            try {
                await navigator.clipboard.writeText(link);
                alert("Share link copied.");
            } catch {
                alert(link);
            }
        });

        function render() {
            const stats = store.getStats();
            totalSpaces.textContent = stats.spaces;
            totalMembers.textContent = stats.members;
            totalPosts.textContent = stats.posts;

            const spaces = store.loadSpaces();
            const active = store.getActiveSpace();
            heroSpaceName.textContent = active ? active.name : "No space yet";
            heroShareLink.textContent = active ? store.getShareLink(active) : "Create a space from the post page";

            if (!spaces.length) {
                spaceGrid.innerHTML = '<article class="empty-state glow-card"><h3>No spaces yet</h3><p>Create a new space from the posting page to get started.</p></article>';
                return;
            }

            spaceGrid.innerHTML = spaces.map((space) => `
                <article class="space-card-page glow-card">
                    <p class="micro-label">${space.allowUploads ? "Contributors can post" : "Owner only"}</p>
                    <h3>${space.name}</h3>
                    <p>${space.description || "No description yet."}</p>
                    <div class="card-row"><strong>${space.posts.length} posts</strong><span>${space.members.length} members</span></div>
                    <div class="page-links">
                        <a class="btn btn-secondary" href="post.html?space=${space.slug}">Post Here</a>
                        <a class="btn btn-secondary" href="space.html?space=${space.slug}">View Space</a>
                    </div>
                </article>
            `).join("");
        }
    });
})();
