(function () {
    const STORAGE_KEY = "frameshare-spaces-v3";
    const MEMBER_KEY = "frameshare-user-v3";
    const USERS_KEY = "frameshare-auth-users-v1";
    const SESSION_KEY = "frameshare-auth-session-v2";
    const DB_NAME = "frameshare-media-db";
    const DB_VERSION = 1;
    const STORE_NAME = "media";
    const googleSheetConfig = window.FrameShareGoogleSheetConfig || {};
    const GOOGLE_FORM_ACTION_URL = googleSheetConfig.formActionUrl || "";
    const GOOGLE_SCRIPT_URL = googleSheetConfig.scriptUrl || "";
    const GOOGLE_FORM_FIELDS = {
        name: googleSheetConfig.fields?.name || "",
        email: googleSheetConfig.fields?.email || "",
        page: googleSheetConfig.fields?.page || "",
        timestamp: googleSheetConfig.fields?.timestamp || "",
        eventType: googleSheetConfig.fields?.eventType || ""
    };

    let dbPromise;

    function loadSpaces() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveSpaces(spaces) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(spaces));
    }

    function getCurrentUser() {
        try {
            return JSON.parse(sessionStorage.getItem(MEMBER_KEY)) || null;
        } catch {
            return null;
        }
    }

    function setCurrentUser(user) {
        sessionStorage.setItem(MEMBER_KEY, JSON.stringify(user));
    }

    function clearCurrentUser() {
        sessionStorage.removeItem(MEMBER_KEY);
    }

    function getAuthUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveAuthUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function getAuthUser() {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
        } catch {
            return null;
        }
    }

    function setAuthUser(user) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }

    function registerAuthUser(payload) {
        const users = getAuthUsers();
        const email = payload.email.toLowerCase().trim();
        if (users.some((user) => user.email === email)) {
            throw new Error("An account with this email already exists.");
        }
        const nextUser = {
            id: crypto.randomUUID(),
            name: payload.name.trim(),
            email,
            password: payload.password
        };
        users.push(nextUser);
        saveAuthUsers(users);
        const sessionUser = { id: nextUser.id, name: nextUser.name, email: nextUser.email };
        setAuthUser(sessionUser);
        syncMemberFromAuth(sessionUser.name);
        return sessionUser;
    }

    function loginAuthUser(payload) {
        const email = payload.email.toLowerCase().trim();
        const user = getAuthUsers().find((item) => item.email === email && item.password === payload.password);
        if (!user) {
            throw new Error("Invalid email or password.");
        }
        const sessionUser = { id: user.id, name: user.name, email: user.email };
        setAuthUser(sessionUser);
        syncMemberFromAuth(sessionUser.name);
        return sessionUser;
    }

    function logoutAuthUser() {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(MEMBER_KEY);
    }

    function clearPageSession() {
        logoutAuthUser();
    }

    function syncMemberFromAuth(name) {
        const spaces = loadSpaces();
        for (const space of spaces) {
            const member = space.members.find((item) => item.name.toLowerCase() === name.toLowerCase());
            if (member) {
                setCurrentUser({ name: member.name, role: member.role, activeSpaceId: space.id });
                return member;
            }
        }
        clearCurrentUser();
        return null;
    }

    function openDatabase() {
        if (dbPromise) {
            return dbPromise;
        }
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                    store.createIndex("spaceId", "spaceId", { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return dbPromise;
    }

    async function saveMediaRecord(record) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).put(record);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async function getMediaRecord(id) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const request = transaction.objectStore(STORE_NAME).get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteMediaRecord(id) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).delete(id);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    function slugify(value) {
        return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "shared-space";
    }

    function ensureUniqueSlug(baseSlug, spaces) {
        const safeBase = baseSlug || `space-${Math.floor(Math.random() * 10000)}`;
        let slug = safeBase;
        let counter = 2;
        while (spaces.some((space) => space.slug === slug)) {
            slug = `${safeBase}-${counter}`;
            counter += 1;
        }
        return slug;
    }

    function createSpace(payload) {
        const spaces = loadSpaces();
        const authUser = getAuthUser();
        const owner = authUser?.name || payload.owner;
        const slug = ensureUniqueSlug(slugify(payload.slug || payload.name), spaces);
        const newSpace = {
            id: crypto.randomUUID(),
            name: payload.name,
            owner,
            slug,
            description: payload.description || "",
            allowUploads: Boolean(payload.allowUploads),
            createdAt: new Date().toISOString(),
            members: [{ id: crypto.randomUUID(), name: owner, role: "owner", joinedAt: new Date().toISOString() }],
            posts: []
        };
        spaces.unshift(newSpace);
        saveSpaces(spaces);
        setCurrentUser({ name: owner, role: "owner", activeSpaceId: newSpace.id });
        return newSpace;
    }

    function joinSpace(spaceId, member) {
        const spaces = loadSpaces();
        const authUser = getAuthUser();
        const displayName = authUser?.name || member.name;
        const space = spaces.find((item) => item.id === spaceId);
        if (!space) {
            throw new Error("Space not found");
        }
        if (!displayName) {
            throw new Error("A display name is required.");
        }
        const existing = space.members.find((item) => item.name.toLowerCase() === displayName.toLowerCase());
        if (existing) {
            setCurrentUser({ name: existing.name, role: existing.role, activeSpaceId: space.id });
            saveSpaces(spaces);
            return { space, member: existing, existing: true };
        }
        const nextMember = {
            id: crypto.randomUUID(),
            name: displayName,
            role: member.role,
            joinedAt: new Date().toISOString()
        };
        space.members.push(nextMember);
        saveSpaces(spaces);
        setCurrentUser({ name: nextMember.name, role: nextMember.role, activeSpaceId: space.id });
        return { space, member: nextMember, existing: false };
    }

    async function addPosts(spaceId, files, caption, author) {
        const spaces = loadSpaces();
        const space = spaces.find((item) => item.id === spaceId);
        if (!space) {
            throw new Error("Space not found");
        }
        for (const [index, file] of files.entries()) {
            const postId = crypto.randomUUID();
            const type = file.type.startsWith("video/") ? "video" : "image";
            await saveMediaRecord({ id: postId, spaceId, file });
            const suffix = files.length > 1 && caption ? ` #${index + 1}` : "";
            space.posts.unshift({
                id: postId,
                type,
                caption: caption ? `${caption}${suffix}` : "",
                author,
                createdAt: new Date().toISOString()
            });
        }
        saveSpaces(spaces);
        return space;
    }

    async function deletePost(postId, author) {
        const spaces = loadSpaces();
        let removed = false;
        for (const space of spaces) {
            const index = space.posts.findIndex((post) => post.id === postId && (!author || post.author.toLowerCase() === author.toLowerCase()));
            if (index !== -1) {
                space.posts.splice(index, 1);
                removed = true;
                break;
            }
        }
        if (!removed) {
            throw new Error("Post not found.");
        }
        await deleteMediaRecord(postId);
        saveSpaces(spaces);
    }

    function getStats() {
        const spaces = loadSpaces();
        return {
            spaces: spaces.length,
            members: spaces.reduce((sum, space) => sum + space.members.length, 0),
            posts: spaces.reduce((sum, space) => sum + space.posts.length, 0)
        };
    }

    function getActiveSpace() {
        const currentUser = getCurrentUser();
        const spaces = loadSpaces();
        if (currentUser?.activeSpaceId) {
            return spaces.find((space) => space.id === currentUser.activeSpaceId) || spaces[0] || null;
        }
        return spaces[0] || null;
    }

    function setActiveSpace(spaceId) {
        const spaces = loadSpaces();
        const currentUser = getCurrentUser();
        const authUser = getAuthUser();
        const space = spaces.find((item) => item.id === spaceId);
        if (!space) {
            return;
        }
        if (currentUser && currentUser.name) {
            const member = space.members.find((item) => item.name.toLowerCase() === currentUser.name.toLowerCase());
            setCurrentUser({ name: currentUser.name, role: member?.role || currentUser.role, activeSpaceId: spaceId });
            return;
        }
        if (authUser?.name) {
            const member = space.members.find((item) => item.name.toLowerCase() === authUser.name.toLowerCase());
            if (member) {
                setCurrentUser({ name: member.name, role: member.role, activeSpaceId: spaceId });
            } else {
                setCurrentUser({ name: authUser.name, role: "viewer", activeSpaceId: spaceId });
            }
            return;
        }
        setCurrentUser({ name: "Guest", role: "viewer", activeSpaceId: spaceId });
    }

    function getPostsByAuthor(author) {
        if (!author) {
            return [];
        }
        const spaces = loadSpaces();
        return spaces.flatMap((space) =>
            space.posts
                .filter((post) => post.author.toLowerCase() === author.toLowerCase())
                .map((post) => ({ ...post, spaceId: space.id, spaceName: space.name, spaceSlug: space.slug }))
        );
    }

    function getMemberships(author) {
        if (!author) {
            return [];
        }
        return loadSpaces().filter((space) =>
            space.members.some((member) => member.name.toLowerCase() === author.toLowerCase())
        );
    }

    async function seedDemoContent() {
        const spaces = loadSpaces();
        const demoSpace = {
            id: crypto.randomUUID(),
            name: "Goa Sunset Club",
            owner: "Mira",
            slug: ensureUniqueSlug("goa-sunset-club", spaces),
            description: "A dreamy trip album for beach photos, short cinematic clips, and guest memories.",
            allowUploads: true,
            createdAt: new Date().toISOString(),
            members: [
                { id: crypto.randomUUID(), name: "Mira", role: "owner", joinedAt: new Date().toISOString() },
                { id: crypto.randomUUID(), name: "Rohan", role: "contributor", joinedAt: new Date().toISOString() },
                { id: crypto.randomUUID(), name: "Kiara", role: "viewer", joinedAt: new Date().toISOString() }
            ],
            posts: []
        };
        spaces.unshift(demoSpace);
        for (const sample of createDemoSamples()) {
            const postId = crypto.randomUUID();
            await saveMediaRecord({ id: postId, spaceId: demoSpace.id, file: sample.file });
            demoSpace.posts.unshift({
                id: postId,
                type: "image",
                caption: sample.caption,
                author: "Mira",
                createdAt: new Date().toISOString()
            });
        }
        saveSpaces(spaces);
        setCurrentUser({ name: "Mira", role: "owner", activeSpaceId: demoSpace.id });
        return demoSpace;
    }

    function createDemoSamples() {
        return [
            makeDemoImage("golden-hour.svg", "Golden hour by the sea", "#18384b", "#f36b3d"),
            makeDemoImage("palm-shadows.svg", "Palm shadows and slow afternoons", "#1d2a24", "#2f7f69")
        ];
    }

    function makeDemoImage(filename, caption, background, accent) {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
                <defs>
                    <linearGradient id="paint" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${background}" />
                        <stop offset="100%" stop-color="${accent}" />
                    </linearGradient>
                </defs>
                <rect width="1200" height="900" fill="url(#paint)" />
                <circle cx="940" cy="190" r="120" fill="rgba(255,255,255,0.16)" />
                <path d="M0 660 C200 560 420 590 640 720 C850 830 1040 830 1200 760 L1200 900 L0 900 Z" fill="rgba(0,0,0,0.2)" />
                <text x="90" y="160" fill="rgba(255,255,255,0.82)" font-family="Arial" font-size="72" font-weight="700">${caption}</text>
            </svg>
        `.trim();
        return { caption, file: new File([svg], filename, { type: "image/svg+xml" }) };
    }

    function getShareLink(space) {
        return `${location.origin}${location.pathname.replace(/[^/]+$/, "")}space.html?space=${space.slug}`;
    }

    async function logAuthEvent(details) {
        const normalized = {
            name: details.name || "",
            email: details.email || "",
            page: details.page || location.pathname,
            timestamp: new Date().toISOString(),
            eventType: details.eventType || "login"
        };

        if (GOOGLE_SCRIPT_URL) {
            const payload = new URLSearchParams();
            payload.set("name", normalized.name);
            payload.set("email", normalized.email);
            payload.set("page", normalized.page);
            payload.set("timestamp", normalized.timestamp);
            payload.set("eventType", normalized.eventType);
            try {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                    body: payload.toString()
                });
                return true;
            } catch {
                return false;
            }
        }

        if (!GOOGLE_FORM_ACTION_URL || !GOOGLE_FORM_FIELDS.name || !GOOGLE_FORM_FIELDS.email) {
            return false;
        }

        const payload = new URLSearchParams();
        payload.set(GOOGLE_FORM_FIELDS.name, normalized.name);
        payload.set(GOOGLE_FORM_FIELDS.email, normalized.email);
        if (GOOGLE_FORM_FIELDS.page) {
            payload.set(GOOGLE_FORM_FIELDS.page, normalized.page);
        }
        if (GOOGLE_FORM_FIELDS.timestamp) {
            payload.set(GOOGLE_FORM_FIELDS.timestamp, normalized.timestamp);
        }
        if (GOOGLE_FORM_FIELDS.eventType) {
            payload.set(GOOGLE_FORM_FIELDS.eventType, normalized.eventType);
        }
        try {
            await fetch(GOOGLE_FORM_ACTION_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: payload.toString()
            });
            return true;
        } catch {
            return false;
        }
    }

    window.FrameShareStore = {
        loadSpaces,
        saveSpaces,
        getCurrentUser,
        setCurrentUser,
        getAuthUser,
        registerAuthUser,
        loginAuthUser,
        logoutAuthUser,
        clearPageSession,
        getStats,
        getActiveSpace,
        setActiveSpace,
        createSpace,
        joinSpace,
        addPosts,
        deletePost,
        getPostsByAuthor,
        getMemberships,
        getMediaRecord,
        seedDemoContent,
        getShareLink,
        openDatabase,
        logAuthEvent
    };
})();
