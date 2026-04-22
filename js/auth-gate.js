(function () {
    const store = window.FrameShareStore;
    let readyResolve;
    window.FrameShareAuthGateReady = new Promise((resolve) => {
        readyResolve = resolve;
    });

    if (store.getAuthUser()) {
        readyResolve();
        window.dispatchEvent(new CustomEvent("frameshare:auth-ready"));
        return;
    }

    injectModal();

    function injectModal() {
        document.body.classList.add("auth-locked");
        document.body.insertAdjacentHTML("beforeend", `
            <div class="auth-overlay" id="authOverlay">
                <div class="auth-modal glow-card">
                    <div class="auth-header">
                        <p class="eyebrow">Login Required</p>
                        <h2>Sign in to open this page.</h2>
                        <p class="helper-text">This popup only appears when no login session is active. Passwords are not sent to Google Forms.</p>
                    </div>
                    <div class="auth-toggle-row">
                        <button type="button" class="subtle-button active-auth-toggle" data-auth-tab="login">Login</button>
                        <button type="button" class="subtle-button" data-auth-tab="register">Create account</button>
                    </div>
                    <p class="status-line" id="authGateMessage">Use your account to continue.</p>
                    <form class="auth-popup-form" id="popupLoginForm">
                        <label>
                            Email
                            <input name="email" type="email" placeholder="you@example.com" required>
                        </label>
                        <label>
                            Password
                            <input name="password" type="password" placeholder="Your password" required>
                        </label>
                        <button class="btn btn-primary wide" type="submit">Login And Continue</button>
                    </form>
                    <form class="auth-popup-form hidden-panel" id="popupRegisterForm">
                        <label>
                            Name
                            <input name="name" type="text" placeholder="Ex. Dhruv" required>
                        </label>
                        <label>
                            Email
                            <input name="email" type="email" placeholder="you@example.com" required>
                        </label>
                        <label>
                            Password
                            <input name="password" type="password" placeholder="Create a password" required>
                        </label>
                        <button class="btn btn-primary wide" type="submit">Create Account And Continue</button>
                    </form>
                </div>
            </div>
        `);

        const overlay = document.getElementById("authOverlay");
        const loginForm = document.getElementById("popupLoginForm");
        const registerForm = document.getElementById("popupRegisterForm");
        const message = document.getElementById("authGateMessage");
        const toggleButtons = Array.from(document.querySelectorAll("[data-auth-tab]"));

        toggleButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const isLogin = button.dataset.authTab === "login";
                loginForm.classList.toggle("hidden-panel", !isLogin);
                registerForm.classList.toggle("hidden-panel", isLogin);
                toggleButtons.forEach((item) => item.classList.toggle("active-auth-toggle", item === button));
                message.textContent = isLogin ? "Use your account to continue." : "Create an account for this browser-based prototype.";
            });
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
                unlock(overlay);
            } catch (error) {
                message.textContent = error.message;
            }
        });

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
                unlock(overlay);
            } catch (error) {
                message.textContent = error.message;
            }
        });
    }

    function unlock(overlay) {
        overlay.remove();
        document.body.classList.remove("auth-locked");
        readyResolve();
        window.dispatchEvent(new CustomEvent("frameshare:auth-ready"));
    }
})();
