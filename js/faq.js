(() => {
    const searchForm = document.querySelector("#faq-search-form");
    const searchInput = document.querySelector("#faq-search-input");
    const categoryList = document.querySelector(".faq-category-list");
    const status = document.querySelector("#faq-results-status");
    const noResults = document.querySelector("#faq-no-results");
    const resetButton = document.querySelector("#faq-reset");
    const items = [...document.querySelectorAll(".faq-item[data-faq-category][data-faq-search]")];
    const groups = [...document.querySelectorAll(".faq-group[data-faq-group]")];

    if (!searchForm || !searchInput || !categoryList || !status || !noResults || !resetButton) return;

    const filters = [...categoryList.querySelectorAll("[data-faq-filter]")];
    let selectedCategory = "all";

    const updateFaqResults = () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        let visibleCount = 0;

        items.forEach((item) => {
            const matchesCategory = selectedCategory === "all" || item.dataset.faqCategory === selectedCategory;
            const searchableText = `${item.dataset.faqSearch} ${item.querySelector("summary").textContent} ${item.querySelector("p").textContent}`.toLocaleLowerCase();
            const matchesQuery = !query || searchableText.includes(query);
            const isVisible = matchesCategory && matchesQuery;

            item.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        groups.forEach((group) => {
            group.hidden = !group.querySelector(".faq-item:not([hidden])");
        });

        if (query) {
            status.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "answer" : "answers"} for “${searchInput.value.trim()}”`;
        } else if (selectedCategory === "all") {
            status.textContent = `Showing all ${visibleCount} questions`;
        } else {
            const label = filters.find((filter) => filter.dataset.faqFilter === selectedCategory)?.querySelector("span").textContent;
            status.textContent = `Showing ${visibleCount} ${label.toLowerCase()} ${visibleCount === 1 ? "question" : "questions"}`;
        }

        noResults.hidden = visibleCount !== 0;
    };

    categoryList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-faq-filter]");
        if (!button) return;

        selectedCategory = button.dataset.faqFilter;
        filters.forEach((filter) => {
            const isSelected = filter === button;
            filter.classList.toggle("is-selected", isSelected);
            filter.setAttribute("aria-pressed", String(isSelected));
        });
        updateFaqResults();
    });

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        updateFaqResults();
        document.querySelector("#all-questions").scrollIntoView({ behavior: "smooth" });
    });

    searchInput.addEventListener("input", updateFaqResults);

    const resetFaq = () => {
        searchInput.value = "";
        selectedCategory = "all";
        filters.forEach((filter) => {
            const isSelected = filter.dataset.faqFilter === "all";
            filter.classList.toggle("is-selected", isSelected);
            filter.setAttribute("aria-pressed", String(isSelected));
        });
        updateFaqResults();
    };

    resetButton.addEventListener("click", () => {
        resetFaq();
        searchInput.focus();
    });

    document.querySelectorAll('.faq-popular-grid a[href^="#faq-"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const item = document.querySelector(link.getAttribute("href"));
            if (!item) return;

            event.preventDefault();
            resetFaq();
            item.open = true;
            history.replaceState(null, "", link.getAttribute("href"));
            item.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    });

    const initialItem = location.hash ? document.querySelector(location.hash) : null;
    if (initialItem?.matches(".faq-item")) {
        initialItem.open = true;
        window.requestAnimationFrame(() => initialItem.scrollIntoView({ block: "center" }));
    }

    updateFaqResults();
})();
