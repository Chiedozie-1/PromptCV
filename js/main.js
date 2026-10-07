(() => {
    document.documentElement.classList.add("js");

    const year = document.querySelector("[data-current-year]");
    if (year) year.textContent = String(new Date().getFullYear());

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