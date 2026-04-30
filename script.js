const CHECKLIST_STORAGE_KEY =
  document.body.dataset.checklistStorageKey || "caterham-academy-2026:checklist:v1";
const checklistLists = Array.from(document.querySelectorAll("[data-checklist]"));
const checklistProgress = document.querySelector("#checklist-progress");
const resetChecklistButton = document.querySelector("#reset-checklist");

function getChecklistStorage() {
  try {
    const testKey = `${CHECKLIST_STORAGE_KEY}:test`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function readChecklistState(storage) {
  if (!storage) return {};

  try {
    return JSON.parse(storage.getItem(CHECKLIST_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeChecklistState(storage, state) {
  if (!storage) return;

  try {
    storage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Keep the checklist usable even if browser storage is unavailable or full.
  }
}

function updateChecklistProgress(inputs, storage) {
  if (!checklistProgress) return;

  const checkedCount = inputs.filter((input) => input.checked).length;
  const storageNote = storage ? "" : " Browser storage is unavailable.";
  checklistProgress.textContent =
    checkedCount === 1
      ? `1 of ${inputs.length} checks complete.${storageNote}`
      : `${checkedCount} of ${inputs.length} checks complete.${storageNote}`;
}

function initialiseChecklists() {
  if (!checklistLists.length) return;

  const storage = getChecklistStorage();
  const state = readChecklistState(storage);
  const inputs = [];

  checklistLists.forEach((list) => {
    const listId = list.dataset.checklist;

    Array.from(list.children).forEach((item, index) => {
      if (item.tagName !== "LI") return;

      const itemKey = `${listId}:${index + 1}`;
      const checkboxId = `checklist-${listId}-${index + 1}`;
      const checkbox = document.createElement("input");
      const label = document.createElement("label");
      const text = document.createElement("span");

      checkbox.type = "checkbox";
      checkbox.id = checkboxId;
      checkbox.checked = Boolean(state[itemKey]);

      label.className = "checklist-item";
      label.htmlFor = checkboxId;
      text.className = "checklist-text";

      while (item.firstChild) {
        text.appendChild(item.firstChild);
      }

      label.append(checkbox, text);
      item.append(label);
      item.classList.toggle("is-complete", checkbox.checked);
      inputs.push(checkbox);

      checkbox.addEventListener("change", () => {
        item.classList.toggle("is-complete", checkbox.checked);

        if (checkbox.checked) {
          state[itemKey] = true;
        } else {
          delete state[itemKey];
        }

        writeChecklistState(storage, state);
        updateChecklistProgress(inputs, storage);
      });
    });
  });

  resetChecklistButton?.addEventListener("click", () => {
    inputs.forEach((input) => {
      input.checked = false;
      input.closest("li")?.classList.remove("is-complete");
    });

    Object.keys(state).forEach((key) => {
      delete state[key];
    });

    if (storage) {
      try {
        storage.removeItem(CHECKLIST_STORAGE_KEY);
      } catch {
        writeChecklistState(storage, state);
      }
    }

    updateChecklistProgress(inputs, storage);
  });

  updateChecklistProgress(inputs, storage);
}

initialiseChecklists();

const searchInput = document.querySelector("#site-search");
const statusNode = document.querySelector("#search-status");
const searchableSections = Array.from(document.querySelectorAll(".searchable"));
const tableRows = Array.from(document.querySelectorAll(".searchable tbody tr"));
const listItems = Array.from(
  document.querySelectorAll(".searchable li, .searchable .todo-item, .searchable .prep-item"),
);
const prepGroups = Array.from(document.querySelectorAll(".searchable .prep-group"));

if (searchInput && statusNode) {
  function normalise(value) {
    return value.toLowerCase().trim();
  }

  function sectionHasVisibleContent(section, query) {
    const visibleRows = Array.from(section.querySelectorAll("tbody tr")).some(
      (row) => !row.classList.contains("is-hidden"),
    );
    const textBlocks = Array.from(section.querySelectorAll("li, .todo-item, .prep-item"));
    const visibleText = textBlocks.some((item) => !item.classList.contains("is-hidden"));
    return visibleRows || visibleText || Boolean(query && normalise(section.textContent).includes(query));
  }

  function applySearch() {
    const query = normalise(searchInput.value);
    let matches = 0;

    tableRows.forEach((row) => {
      const isMatch = !query || normalise(row.textContent).includes(query);
      row.classList.toggle("is-hidden", !isMatch);
      if (isMatch) matches += 1;
    });

    listItems.forEach((item) => {
      const isMatch = !query || normalise(item.textContent).includes(query);
      item.classList.toggle("is-hidden", !isMatch);
      if (isMatch && query) matches += 1;
    });

    prepGroups.forEach((group) => {
      const visibleItems = Array.from(group.querySelectorAll(".prep-item")).some(
        (item) => !item.classList.contains("is-hidden"),
      );
      group.classList.toggle("is-hidden", Boolean(query) && !visibleItems);
    });

    searchableSections.forEach((section) => {
      section.classList.toggle("is-hidden", !sectionHasVisibleContent(section, query));
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The site still works normally if service worker registration is blocked.
    });
  });
}
