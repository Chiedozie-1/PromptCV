(() => {
    const toggle = document.querySelector(".nav-toggle");
    const panel = document.querySelector("#primary-navigation");

    if (!toggle || !panel) return;

    const closeMenu = () => {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation");
        panel.classList.remove("is-open");
    };

    toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
        panel.classList.toggle("is-open", !isOpen);
    });

    panel.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", (event) => {
        if (!panel.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
})();