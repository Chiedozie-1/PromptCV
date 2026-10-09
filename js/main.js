(() => {
    document.documentElement.classList.add("js");

    const year = document.querySelector("[data-current-year]");
    if (year) year.textContent = String(new Date().getFullYear());

    const waitlistDialog = document.createElement("dialog");
    waitlistDialog.className = "waitlist-dialog";
    waitlistDialog.setAttribute("aria-labelledby", "waitlist-title");
    waitlistDialog.setAttribute("aria-describedby", "waitlist-description");
    const privacyPath = window.location.pathname.includes("/comapny/") ? "../privacy.html" : "privacy.html";
    waitlistDialog.innerHTML = `
        <div class="waitlist-dialog-panel">
            <button class="waitlist-dialog-close" type="button" aria-label="Close dialog">&times;</button>
            <p class="eyebrow">BE FIRST TO KNOW</p>
            <h2 id="waitlist-title">PromptCV is Coming Soon!</h2>
            <p class="waitlist-description" id="waitlist-description">We're building a smarter way to create professional, ATS-friendly resumes. Join the waitlist and be among the first to know when PromptCV launches.</p>
            <form class="waitlist-form" novalidate>
                <label for="waitlist-email">Email address</label>
                <input id="waitlist-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" maxlength="254" required>
                <label class="waitlist-consent">
                    <input name="consent" type="checkbox" required>
                    <span>By joining, you agree to receive PromptCV launch updates by email. You can withdraw consent by contacting us. See our <a href="${privacyPath}">Privacy Policy</a>.</span>
                </label>
                <button class="button button-large waitlist-submit" type="submit">Join the Waitlist <span aria-hidden="true">→</span></button>
                <p class="waitlist-status" role="status" aria-live="polite"></p>
            </form>
        </div>`;
    document.body.append(waitlistDialog);

    const waitlistForm = waitlistDialog.querySelector(".waitlist-form");
    const waitlistEmail = waitlistForm.elements.email;
    const waitlistConsent = waitlistForm.elements.consent;
    const waitlistSubmit = waitlistForm.querySelector(".waitlist-submit");
    const waitlistStatus = waitlistForm.querySelector(".waitlist-status");
    let waitlistSubmitting = false;

    document.addEventListener("click", (event) => {
        const link = event.target.closest("a[href]");
        if (!link) return;

        let destination;
        try {
            destination = new URL(link.href);
        } catch {
            return;
        }

        if (destination.hostname !== "app.promptcv.com") return;
        event.preventDefault();
        if (!waitlistSubmitting) {
            waitlistStatus.textContent = "";
            waitlistStatus.classList.remove("is-error");
            waitlistForm.hidden = false;
            waitlistEmail.disabled = false;
            waitlistConsent.disabled = false;
            waitlistSubmit.disabled = false;
            waitlistSubmit.innerHTML = 'Join the Waitlist <span aria-hidden="true">→</span>';
            waitlistForm.reset();
        }
        if (!waitlistDialog.open) waitlistDialog.showModal();
        if (!waitlistSubmitting) waitlistEmail.focus();
    });

    waitlistDialog.querySelector(".waitlist-dialog-close").addEventListener("click", () => {
        waitlistDialog.close();
    });
    waitlistDialog.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        waitlistDialog.close();
    });
    waitlistDialog.addEventListener("click", (event) => {
        if (event.target === waitlistDialog) waitlistDialog.close();
    });

    waitlistForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (waitlistSubmitting) return;
        waitlistEmail.value = waitlistEmail.value.trim();
        if (!waitlistForm.reportValidity()) return;

        const email = waitlistEmail.value.toLowerCase();
        if (!email || !waitlistEmail.validity.valid || !waitlistConsent.checked) {
            waitlistForm.reportValidity();
            return;
        }

        waitlistEmail.value = email;
        waitlistSubmitting = true;
        waitlistSubmit.disabled = true;
        waitlistSubmit.textContent = "Joining…";
        waitlistStatus.textContent = "Adding you to the waitlist…";

        try {
            const response = await fetch("/api/waitlist/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, consent: true })
            });
            const result = await response.json();
            if (!response.ok || result.ok !== true) throw new Error("Waitlist signup failed");

            waitlistSubmitting = false;
            waitlistForm.hidden = true;
            waitlistStatus.textContent = "You're on the list! We'll email you when PromptCV launches.";
        } catch {
            waitlistSubmitting = false;
            waitlistSubmit.disabled = false;
            waitlistSubmit.innerHTML = 'Join the Waitlist <span aria-hidden="true">→</span>';
            waitlistStatus.textContent = "We couldn't add you right now. Please try again in a moment.";
            waitlistStatus.classList.add("is-error");
        }
    });
    waitlistForm.addEventListener("input", () => {
        waitlistStatus.classList.remove("is-error");
        waitlistStatus.textContent = "";
    });

    const revealTargets = document.querySelectorAll(
        ".intro-layout, .section-heading, .feature-card, .steps-list li, .ats-card, .templates-layout, .pricing-banner, .faq-list details, .final-cta-inner, .overview-heading, .overview-card, .detail-layout, .ats-feature-layout, .feature-cta, .journey-step, .process-overview, .outcome-card"
    );

    const featureQuickNav = document.querySelector(".feature-quick-nav");
    if (featureQuickNav) {
        const featureSections = [...featureQuickNav.querySelectorAll("a[href^='#']")]
            .map((link) => ({
                link,
                section: document.querySelector(link.getAttribute("href"))
            }))
            .filter((item) => item.section);
        let scrollTicking = false;

        const updateFeatureQuickNav = () => {
            scrollTicking = false;
            if (!featureSections.length) return;

            const firstSection = featureSections[0].section;
            const lastSection = featureSections[featureSections.length - 1].section;
            const scrollPosition = window.scrollY;
            const showNav = scrollPosition >= firstSection.offsetTop - 120
                && scrollPosition < lastSection.offsetTop + lastSection.offsetHeight;

            featureQuickNav.classList.toggle("is-visible", showNav);
            featureQuickNav.setAttribute("aria-hidden", String(!showNav));

            if (!showNav) return;

            const activeLine = window.innerHeight * 0.38;
            const activeSection = featureSections.find(({ section }) => {
                const bounds = section.getBoundingClientRect();
                return bounds.top <= activeLine && bounds.bottom > activeLine;
            }) || featureSections.find(({ section }) => section.getBoundingClientRect().top > activeLine)
                || featureSections[featureSections.length - 1];

            featureSections.forEach(({ link }) => {
                const isActive = link === activeSection.link;
                link.classList.toggle("is-active", isActive);
                if (isActive) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        };

        const queueFeatureQuickNavUpdate = () => {
            if (scrollTicking) return;
            scrollTicking = true;
            window.requestAnimationFrame(updateFeatureQuickNav);
        };

        window.addEventListener("scroll", queueFeatureQuickNavUpdate, { passive: true });
        window.addEventListener("resize", queueFeatureQuickNavUpdate);
        featureQuickNav.addEventListener("click", (event) => {
            if (!event.target.closest("a")) return;
            window.setTimeout(queueFeatureQuickNavUpdate, 450);
        });
        updateFeatureQuickNav();
    }

    const journeyQuickNav = document.querySelector(".journey-quick-nav");
    if (journeyQuickNav) {
        const journeySections = [...journeyQuickNav.querySelectorAll("a[href^='#']")]
            .map((link) => ({
                link,
                section: document.querySelector(link.getAttribute("href"))
            }))
            .filter((item) => item.section);
        let journeyScrollTicking = false;

        const updateJourneyQuickNav = () => {
            journeyScrollTicking = false;
            if (!journeySections.length) return;

            const firstSection = journeySections[0].section;
            const lastSection = journeySections[journeySections.length - 1].section;
            const scrollPosition = window.scrollY;
            const showNav = scrollPosition >= firstSection.offsetTop - 120
                && scrollPosition < lastSection.offsetTop + lastSection.offsetHeight;

            journeyQuickNav.classList.toggle("is-visible", showNav);
            journeyQuickNav.setAttribute("aria-hidden", String(!showNav));

            if (!showNav) return;

            const activeLine = window.innerHeight * 0.38;
            const activeSection = journeySections.find(({ section }) => {
                const bounds = section.getBoundingClientRect();
                return bounds.top <= activeLine && bounds.bottom > activeLine;
            }) || journeySections.find(({ section }) => section.getBoundingClientRect().top > activeLine)
                || journeySections[journeySections.length - 1];

            journeySections.forEach(({ link }) => {
                const isActive = link === activeSection.link;
                link.classList.toggle("is-active", isActive);
                if (isActive) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        };

        const queueJourneyQuickNavUpdate = () => {
            if (journeyScrollTicking) return;
            journeyScrollTicking = true;
            window.requestAnimationFrame(updateJourneyQuickNav);
        };

        window.addEventListener("scroll", queueJourneyQuickNavUpdate, { passive: true });
        window.addEventListener("resize", queueJourneyQuickNavUpdate);
        journeyQuickNav.addEventListener("click", (event) => {
            if (!event.target.closest("a")) return;
            window.setTimeout(queueJourneyQuickNavUpdate, 450);
        });
        updateJourneyQuickNav();
    }

    const templateFilters = document.querySelector(".template-filters");
    if (templateFilters) {
        const filterButtons = [...templateFilters.querySelectorAll("[data-template-filter]")];
        const templateCards = [...document.querySelectorAll(".template-card[data-template-categories]")];
        const status = document.querySelector(".filter-status");
        const emptyMessage = document.querySelector(".no-templates-message");

        templateFilters.addEventListener("click", (event) => {
            const button = event.target.closest("[data-template-filter]");
            if (!button) return;

            const selectedFilter = button.dataset.templateFilter;
            let visibleCount = 0;

            filterButtons.forEach((filterButton) => {
                const isSelected = filterButton === button;
                filterButton.classList.toggle("is-selected", isSelected);
                filterButton.setAttribute("aria-pressed", String(isSelected));
            });

            templateCards.forEach((card) => {
                const categories = card.dataset.templateCategories.split(" ");
                const isVisible = selectedFilter === "all" || categories.includes(selectedFilter);
                card.hidden = !isVisible;
                if (isVisible) visibleCount += 1;
            });

            if (status) {
                const label = button.childNodes[0].textContent.trim();
                status.textContent = selectedFilter === "all"
                    ? `Showing all ${visibleCount} templates`
                    : `Showing ${visibleCount} ${label.toLowerCase()} ${visibleCount === 1 ? "template" : "templates"}`;
            }
            if (emptyMessage) emptyMessage.hidden = visibleCount !== 0;
        });
    }

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    revealTargets.forEach((target) => {
        target.classList.add("reveal");
        observer.observe(target);
    });
})();