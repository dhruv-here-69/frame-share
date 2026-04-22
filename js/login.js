(function () {
    const store = window.FrameShareStore;
    const authMessage = document.getElementById("authMessage");
    const currentSession = document.getElementById("currentSession");
    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");
    const logoutBtn = document.getElementById("logoutBtn");

    renderSession();

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(registerForm);
        try {
            const user = store.registerAuthUser({
                name: formData.get("name").toString().trim(),
                email: formData.get("email").toString().trim(),
                password: formData.get("password").toString()
            });
            await store.logAuthEvent({
                name: user.name,
                email: user.email,
                page: location.pathname,
                eventType: "register"
            });
            registerForm.reset();
            authMessage.textContent = `Account created for ${user.name}. You are now logged in.`;
            renderSession();
        } catch (error) {
            authMessage.textContent = error.message;
        }
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        try {
            const user = store.loginAuthUser({
                email: formData.get("email").toString().trim(),
                password: formData.get("password").toString()
            });
            await store.logAuthEvent({
                name: user.name,
                email: user.email,
                page: location.pathname,
                eventType: "login"
            });
            loginForm.reset();
            authMessage.textContent = `Welcome back, ${user.name}.`;
            renderSession();
        } catch (error) {
            authMessage.textContent = error.message;
        }
    });

    logoutBtn.addEventListener("click", () => {
        store.logoutAuthUser();
        authMessage.textContent = "You have been logged out.";
        renderSession();
    });

    function renderSession() {
        const user = store.getAuthUser();
        currentSession.textContent = user ? `Logged in as ${user.name} (${user.email})` : "No active login session.";
    }
})();
