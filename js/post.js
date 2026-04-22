(function () {
    const boot = window.FrameShareAuthGateReady || Promise.resolve();
    boot.then(() => {
        const store = window.FrameShareStore;
        const createSpaceForm = document.getElementById("createSpaceForm");
        const joinForm = document.getElementById("joinForm");
        const uploadForm = document.getElementById("uploadForm");
        const spaceSelect = document.getElementById("spaceSelect");
        const activeSpaceName = document.getElementById("activeSpaceName");
        const activeSpaceMeta = document.getElementById("activeSpaceMeta");
        const copyLinkBtn = document.getElementById("copyLinkBtn");
        const openViewerLink = document.getElementById("openViewerLink");
        const authStatus = document.getElementById("authStatus");
        const ownerInput = createSpaceForm.querySelector("input[name='owner']");
        const memberNameInput = joinForm.querySelector("input[name='memberName']");
        const joinSpaceAccessInput = joinForm.querySelector("input[name='spaceAccess']");

        syncSpaceFromQuery();
        syncAuthInputs();
        renderSpaceOptions();
        renderSummary();

        spaceSelect.addEventListener("change", () => {
            store.setActiveSpace(spaceSelect.value);
            renderSummary();
        });

        createSpaceForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const formData = new FormData(createSpaceForm);
            const space = store.createSpace({
                name: formData.get("name").toString().trim(),
                owner: formData.get("owner").toString().trim(),
                slug: formData.get("slug").toString().trim(),
                description: formData.get("description").toString().trim(),
                allowUploads: formData.get("allowUploads") === "on"
            });
            createSpaceForm.reset();
            syncAuthInputs();
            store.setActiveSpace(space.id);
            renderSpaceOptions();
            renderSummary();
            alert(`Space created: ${space.name}`);
        });

        joinForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const formData = new FormData(joinForm);
            const targetSpace = resolveJoinTarget(formData.get("spaceAccess").toString().trim());
            if (!targetSpace) {
                alert("Paste a valid share link or slug for a saved space, or choose one from the dropdown first.");
                return;
            }
            const result = store.joinSpace(targetSpace.id, {
                name: formData.get("memberName").toString().trim(),
                role: formData.get("role").toString()
            });
            store.setActiveSpace(targetSpace.id);
            syncAuthInputs();
            renderSpaceOptions();
            renderSummary();
            alert(result.existing ? "Joined using existing profile." : "You joined the space.");
        });

        uploadForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const active = store.getActiveSpace();
            const currentUser = store.getCurrentUser();
            if (!active) {
                alert("Create or select a space first.");
                return;
            }
            if (!currentUser || currentUser.activeSpaceId !== active.id) {
                alert("Join the current space first.");
                return;
            }
            if (currentUser.name !== active.owner && !active.allowUploads) {
                alert("Only the owner can upload in this space right now.");
                return;
            }
            const formData = new FormData(uploadForm);
            const files = Array.from(formData.getAll("media")).filter((file) => file instanceof File && file.size > 0);
            if (!files.length) {
                alert("Pick at least one file.");
                return;
            }
            await store.addPosts(active.id, files, formData.get("caption").toString().trim(), currentUser.name);
            uploadForm.reset();
            renderSummary();
            alert("Post saved.");
        });

        copyLinkBtn.addEventListener("click", async () => {
            const active = store.getActiveSpace();
            if (!active) {
                alert("No active space.");
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

        function syncAuthInputs() {
            const authUser = store.getAuthUser();
            if (!authUser) {
                authStatus.textContent = "Not logged in.";
                ownerInput.value = "";
                memberNameInput.value = "";
                return;
            }
            authStatus.textContent = `Signed in as ${authUser.name} (${authUser.email})`;
            ownerInput.value = authUser.name;
            memberNameInput.value = authUser.name;
            ownerInput.readOnly = true;
            memberNameInput.readOnly = true;
        }

        function syncSpaceFromQuery() {
            const params = new URLSearchParams(location.search);
            const slug = params.get("space");
            if (!slug) {
                return;
            }
            const space = store.loadSpaces().find((item) => item.slug === slug);
            if (space) {
                store.setActiveSpace(space.id);
                joinSpaceAccessInput.value = space.slug;
            }
        }

        function renderSpaceOptions() {
            const spaces = store.loadSpaces();
            const active = store.getActiveSpace();
            if (!spaces.length) {
                spaceSelect.innerHTML = '<option value="">No spaces yet</option>';
                return;
            }
            spaceSelect.innerHTML = spaces.map((space) => `<option value="${space.id}">${space.name}</option>`).join("");
            if (active) {
                spaceSelect.value = active.id;
                joinSpaceAccessInput.value = active.slug;
            }
        }

        function renderSummary() {
            const active = store.getActiveSpace();
            if (!active) {
                activeSpaceName.textContent = "No space selected";
                activeSpaceMeta.textContent = "Create a space below or choose one from the dropdown.";
                openViewerLink.href = "space.html";
                return;
            }
            activeSpaceName.textContent = active.name;
            activeSpaceMeta.textContent = `${active.posts.length} posts • ${active.members.length} members • ${active.allowUploads ? "contributors can post" : "owner only"}`;
            openViewerLink.href = `space.html?space=${active.slug}`;
        }

        function resolveJoinTarget(rawValue) {
            const spaces = store.loadSpaces();
            const active = store.getActiveSpace();
            if (!rawValue) {
                return active;
            }

            let slug = rawValue.trim().toLowerCase();
            try {
                const parsed = new URL(rawValue);
                slug = new URLSearchParams(parsed.search).get("space") || parsed.pathname.split("/").filter(Boolean).pop() || slug;
            } catch {
                // Raw slug input is valid; keep the trimmed value.
            }

            return spaces.find((space) => space.slug.toLowerCase() === slug) || null;
        }
    });
})();
