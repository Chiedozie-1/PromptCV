(() => {
    const searchForm = document.querySelector("#blog-search-form");
    const searchInput = document.querySelector("#blog-search-input");
    const filterGroup = document.querySelector(".blog-category-filters");
    const resultStatus = document.querySelector("#blog-results-status");
    const noResults = document.querySelector("#blog-no-results");
    const cards = [...document.querySelectorAll("[data-blog-categories][data-blog-search]")];

    if (!searchForm || !searchInput || !filterGroup || !resultStatus || !noResults) return;

    const filters = [...filterGroup.querySelectorAll("[data-blog-filter]")];
    let selectedCategory = "all";

    const renderResults = () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        const activeFilter = filters.find((filter) => filter.dataset.blogFilter === selectedCategory);
        let visibleCount = 0;

        cards.forEach((card) => {
            const categories = card.dataset.blogCategories.split(" ");
            const searchableText = `${card.dataset.blogSearch} ${card.textContent}`.toLocaleLowerCase();
            const matchesCategory = selectedCategory === "all" || categories.includes(selectedCategory);
            const matchesSearch = !query || searchableText.includes(query);
            const isVisible = matchesCategory && matchesSearch;

            card.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        const filterLabel = activeFilter?.textContent.trim() || "All topics";
        if (query) {
            resultStatus.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "guide" : "guides"} for “${searchInput.value.trim()}”`;
        } else if (selectedCategory === "all") {
            resultStatus.textContent = `Showing all ${visibleCount} upcoming guides`;
        } else {
            resultStatus.textContent = `Showing ${visibleCount} upcoming ${filterLabel.toLowerCase()} ${visibleCount === 1 ? "guide" : "guides"}`;
        }

        noResults.hidden = visibleCount !== 0;
    };

    filterGroup.addEventListener("click", (event) => {
        const button = event.target.closest("[data-blog-filter]");
        if (!button) return;

        selectedCategory = button.dataset.blogFilter;
        filters.forEach((filter) => {
            const isSelected = filter === button;
            filter.classList.toggle("is-selected", isSelected);
            filter.setAttribute("aria-pressed", String(isSelected));
        });
        renderResults();
    });

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        renderResults();
        document.querySelector("#upcoming-guides").scrollIntoView({ behavior: "smooth" });
    });

    searchInput.addEventListener("input", renderResults);

    noResults.querySelector("[data-blog-reset]").addEventListener("click", () => {
        searchInput.value = "";
        selectedCategory = "all";
        filters.forEach((filter) => {
            const isSelected = filter.dataset.blogFilter === "all";
            filter.classList.toggle("is-selected", isSelected);
            filter.setAttribute("aria-pressed", String(isSelected));
        });
        renderResults();
        searchInput.focus();
    });

    renderResults();
})();
