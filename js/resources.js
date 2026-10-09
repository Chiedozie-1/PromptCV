(() => {
    const library = document.querySelector("[data-resource-library]");
    if (!library) return;

    const cards = [...library.querySelectorAll("[data-resource-card]")];
    const search = library.querySelector("#resource-search-input");
    const clearSearch = library.querySelector("#resource-search-clear");
    const resultCount = library.querySelector("#resource-result-count");
    const emptyState = library.querySelector("#resource-empty-state");
    const resetButton = library.querySelector("#resource-reset");
    const filters = [...library.querySelectorAll("[data-category-filter]")];
    let activeCategory = "all";

    function updateResults() {
        const query = search.value.trim().toLocaleLowerCase();
        let visibleCount = 0;

        cards.forEach((card) => {
            const categoryMatches = activeCategory === "all" || card.dataset.category === activeCategory;
            const searchableText = `${card.textContent} ${card.dataset.tags || ""} ${card.dataset.category || ""}`
                .toLocaleLowerCase();
            const searchMatches = !query || searchableText.includes(query);
            const isVisible = categoryMatches && searchMatches;
            card.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        const description = query ? `matching “${search.value.trim()}”` : "in this topic";
        resultCount.textContent = visibleCount === cards.length && activeCategory === "all" && !query
            ? `Showing all ${cards.length} career resources.`
            : `Showing ${visibleCount} of ${cards.length} career resources ${description}.`;
        emptyState.hidden = visibleCount !== 0;
        clearSearch.hidden = search.value.length === 0;
    }

    function resetFilters() {
        search.value = "";
        activeCategory = "all";
        filters.forEach((filter) => {
            const isActive = filter.dataset.categoryFilter === "all";
            filter.classList.toggle("is-active", isActive);
            filter.setAttribute("aria-pressed", String(isActive));
        });
        updateResults();
    }

    search.addEventListener("input", updateResults);
    clearSearch.addEventListener("click", () => {
        search.value = "";
        updateResults();
        search.focus();
    });
    filters.forEach((filter) => {
        filter.addEventListener("click", () => {
            activeCategory = filter.dataset.categoryFilter;
            filters.forEach((item) => {
                const isActive = item === filter;
                item.classList.toggle("is-active", isActive);
                item.setAttribute("aria-pressed", String(isActive));
            });
            updateResults();
        });
    });
    resetButton.addEventListener("click", () => {
        resetFilters();
        search.focus();
    });
})();
