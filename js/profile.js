(function () {
    const boot = window.FrameShareAuthGateReady || Promise.resolve();
    boot.then(() => {
        const store = window.FrameShareStore;
        const profileName = document.getElementById("profileName");
        const profileRole = document.getElementById("profileRole");
        const profileSpaces = document.getElementById("profileSpaces");
        const profilePosts = document.getElementById("profilePosts");
        const membershipGrid = document.getElementById("membershipGrid");

        const currentUser = store.getCurrentUser();
        const authUser = store.getAuthUser();
        const activeName = currentUser?.name || authUser?.name;
        const activeRole = currentUser?.role || (authUser ? "account" : null);

        if (!activeName) {
            membershipGrid.innerHTML = '<article class="empty-state glow-card"><h3>No profile yet</h3><p>Log in, go to the post page, join a space, and come back here.</p></article>';
            return;
        }

        const memberships = store.getMemberships(activeName);
        const posts = store.getPostsByAuthor(activeName);

        profileName.textContent = activeName;
        profileRole.textContent = `${activeRole} profile`;
        profileSpaces.textContent = memberships.length;
        profilePosts.textContent = posts.length;

        if (!memberships.length) {
            membershipGrid.innerHTML = '<article class="empty-state glow-card"><h3>No spaces joined</h3><p>Your memberships will appear here after you join a space from the post page.</p></article>';
            return;
        }

        membershipGrid.innerHTML = memberships.map((space) => `
            <article class="space-card-page glow-card">
                <p class="micro-label">${space.owner === activeName ? "Owner" : "Member"}</p>
                <h3>${space.name}</h3>
                <p>${space.description || "No description yet."}</p>
                <div class="page-links">
                    <a class="btn btn-secondary" href="post.html?space=${space.slug}">Open Posting</a>
                    <a class="btn btn-secondary" href="space.html?space=${space.slug}">Open Viewer</a>
                </div>
            </article>
        `).join("");
    });
})();
