const searchInput = document.querySelector("#site-search");
const statusNode = document.querySelector("#search-status");
const searchableSections = Array.from(document.querySelectorAll(".searchable"));
const tableRows = Array.from(document.querySelectorAll(".searchable tbody tr"));

if (searchInput && statusNode) {
  function normalise(value) {
    return value.toLowerCase().trim();
  }

  function sectionHasVisibleContent(section) {
    const visibleRows = Array.from(section.querySelectorAll("tbody tr")).some(
      (row) => !row.classList.contains("is-hidden"),
    );
    const textBlocks = Array.from(section.querySelectorAll(".plain-list li"));
    const visibleText = textBlocks.some((item) => !item.classList.contains("is-hidden"));
    return visibleRows || visibleText;
  }

  function applySearch() {
    const query = normalise(searchInput.value);
    let matches = 0;

    tableRows.forEach((row) => {
      const isMatch = !query || normalise(row.textContent).includes(query);
      row.classList.toggle("is-hidden", !isMatch);
      if (isMatch) matches += 1;
    });

    document.querySelectorAll(".plain-list li").forEach((item) => {
      const isMatch = !query || normalise(item.textContent).includes(query);
      item.classList.toggle("is-hidden", !isMatch);
      if (isMatch && query) matches += 1;
    });

    searchableSections.forEach((section) => {
      section.classList.toggle("is-hidden", !sectionHasVisibleContent(section));
    });

    if (!query) {
      statusNode.textContent = "Showing all entries.";
      return;
    }

    statusNode.textContent =
      matches === 1 ? "Showing 1 matching entry." : `Showing ${matches} matching entries.`;
  }

  searchInput.addEventListener("input", applySearch);
}
