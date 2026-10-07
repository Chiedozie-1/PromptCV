(() => {
    const searchForm = document.querySelector("#examples-search-form");
    const searchInput = document.querySelector("#examples-search-input");
    const experienceGroup = document.querySelector("#experience-filters");
    const industryGroup = document.querySelector("#industry-filters");
    const resultStatus = document.querySelector("#examples-results-status");
    const noResults = document.querySelector("#examples-no-results");
    const resetButton = document.querySelector("#examples-reset");
    const cards = [...document.querySelectorAll(".resume-example-card[data-experience][data-industry][data-example-search]")];

    if (!searchForm || !searchInput || !experienceGroup || !industryGroup || !resultStatus || !noResults || !resetButton) return;

    const experienceFilters = [...experienceGroup.querySelectorAll("[data-experience-filter]")];
    const industryFilters = [...industryGroup.querySelectorAll("[data-industry-filter]")];
    let selectedExperience = "all";
    let selectedIndustry = "all";

    const setSelectedFilter = (filters, selectedButton) => {
        filters.forEach((filter) => {
            const isSelected = filter === selectedButton;
            filter.classList.toggle("is-selected", isSelected);
            filter.setAttribute("aria-pressed", String(isSelected));
        });
    };

    const renderResults = () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        let visibleCount = 0;

        cards.forEach((card) => {
            const experiences = card.dataset.experience.split(" ");
            const industries = card.dataset.industry.split(" ");
            const searchableText = `${card.dataset.exampleSearch} ${card.textContent}`.toLocaleLowerCase();
            const matchesExperience = selectedExperience === "all" || experiences.includes(selectedExperience);
            const matchesIndustry = selectedIndustry === "all" || industries.includes(selectedIndustry);
            const matchesSearch = !query || searchableText.includes(query);
            const isVisible = matchesExperience && matchesIndustry && matchesSearch;

            card.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        resultStatus.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "example" : "examples"}`;
        noResults.hidden = visibleCount !== 0;
    };

    experienceGroup.addEventListener("click", (event) => {
        const button = event.target.closest("[data-experience-filter]");
        if (!button) return;

        selectedExperience = button.dataset.experienceFilter;
        setSelectedFilter(experienceFilters, button);
        renderResults();
    });

    industryGroup.addEventListener("click", (event) => {
        const button = event.target.closest("[data-industry-filter]");
        if (!button) return;

        selectedIndustry = button.dataset.industryFilter;
        setSelectedFilter(industryFilters, button);
        renderResults();
    });

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        renderResults();
        document.querySelector("#browse-examples").scrollIntoView({ behavior: "smooth" });
    });

    searchInput.addEventListener("input", renderResults);

    resetButton.addEventListener("click", () => {
        searchInput.value = "";
        selectedExperience = "all";
        selectedIndustry = "all";
        setSelectedFilter(experienceFilters, experienceFilters[0]);
        setSelectedFilter(industryFilters, industryFilters[0]);
        renderResults();
        searchInput.focus();
    });

    renderResults();
})();
