document.documentElement.classList.add("js-enabled");

const currentPageFile = window.location.pathname.split("/").pop() || "index.html";
const legacyDeliveryPrepHashes = new Set(["#guide", "#todo", "#prep-mods"]);

if (currentPageFile === "index.html" && legacyDeliveryPrepHashes.has(window.location.hash)) {
  window.location.replace(`delivery-prep.html${window.location.hash}`);
}

function initialisePrimaryMenu() {
  const topbar = document.querySelector(".topbar");
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("[data-primary-menu]");

  if (!topbar || !toggle || !menu) return;

  const links = Array.from(menu.querySelectorAll("a"));
  const currentFile = currentPageFile;

  links.forEach((link) => {
    const linkFile = new URL(link.href, window.location.href).pathname.split("/").pop() || "index.html";

    if (linkFile === currentFile) {
      link.setAttribute("aria-current", "page");
    } else if (
      linkFile === "reference.html" &&
      (currentFile.startsWith("guide-") ||
        ["driver-guide.html", "parts.html", "sources.html", "search.html"].includes(currentFile))
    ) {
      link.setAttribute("aria-current", "location");
    } else if (linkFile === "delivery-prep.html" && currentFile === "delivery-prep-builder.html") {
      link.setAttribute("aria-current", "location");
    }
  });

  function isOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  function setOpen(open) {
    topbar.classList.toggle("is-menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => {
    setOpen(!isOpen());
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      setOpen(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (!isOpen() || topbar.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });

  const desktopQuery = window.matchMedia("(min-width: 821px)");
  const closeOnDesktop = () => {
    if (desktopQuery.matches) setOpen(false);
  };

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", closeOnDesktop);
  } else if (desktopQuery.addListener) {
    desktopQuery.addListener(closeOnDesktop);
  }
}

initialisePrimaryMenu();

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

const DELIVERY_FIT_DEFAULT_PARTS = [
  "impact-bar",
  "half-sidescreens",
  "race-mirror",
  "centre-mirror",
  "steering-wheel",
  "brake-pads",
  "master-cylinder-cap",
  "fuel-drain",
  "dash-timer",
  "foot-camera",
  "camera-lens",
  "front-arb",
  "anti-slip-tape",
];

const DELIVERY_FIT_DEPENDENCIES = {
  "half-sidescreens": ["race-mirror"],
  "impact-bar": ["anti-slip-tape"],
};

function initialiseDeliveryFitBuilder() {
  const builder = document.querySelector("[data-delivery-builder]");
  const choices = builder ? Array.from(builder.querySelectorAll("[data-builder-choice]")) : [];
  const fitItems = Array.from(document.querySelectorAll("[data-fit-item]"));
  const summaries = Array.from(document.querySelectorAll("[data-fit-summary]"));
  const emptyMessage = document.querySelector("[data-fit-empty]");
  const selectAllButton = document.querySelector("[data-fit-select-all]");
  const clearButton = document.querySelector("[data-fit-clear]");
  const storageKey = "caterham-academy-2026:delivery-fit-builder:v2";
  const storage = getChecklistStorage();

  if (!builder && !fitItems.length && !summaries.length) return;

  function readSelectedParts() {
    if (!storage) return null;

    try {
      const saved = JSON.parse(storage.getItem(storageKey));
      return Array.isArray(saved) ? new Set(saved) : null;
    } catch {
      return null;
    }
  }

  function writeSelectedParts(selected) {
    if (!storage) return;

    try {
      storage.setItem(storageKey, JSON.stringify(Array.from(selected)));
    } catch {
      // The builder still works for the current page view if storage is unavailable.
    }
  }

  function getDefaultSelection() {
    return new Set(DELIVERY_FIT_DEFAULT_PARTS);
  }

  function getSavedOrDefaultSelection() {
    return readSelectedParts() || getDefaultSelection();
  }

  function getExplicitSelection() {
    return new Set(
      choices
        .filter((choice) => choice.checked && !choice.closest("[data-builder-option]")?.classList.contains("is-dependency-selected"))
        .map((choice) => choice.dataset.builderChoice),
    );
  }

  function expandDependencies(selected) {
    const expanded = new Set(selected);
    let changed = true;

    while (changed) {
      changed = false;

      Array.from(expanded).forEach((part) => {
        (DELIVERY_FIT_DEPENDENCIES[part] || []).forEach((requiredPart) => {
          if (expanded.has(requiredPart)) return;
          expanded.add(requiredPart);
          changed = true;
        });
      });
    }

    return expanded;
  }

  function enforceChoiceDependencies(selected, explicitSelection) {
    if (!choices.length) return;

    choices.forEach((choice) => {
      choice.closest("[data-builder-option]")?.classList.remove("is-dependency-selected");
    });

    choices.forEach((choice) => {
      const part = choice.dataset.builderChoice;
      const isDependency = selected.has(part) && !explicitSelection.has(part);
      choice.checked = selected.has(part);
      choice.closest("[data-builder-option]")?.classList.toggle("is-dependency-selected", isDependency);
    });
  }

  function getSelectionState() {
    const explicitSelection = choices.length ? getExplicitSelection() : getSavedOrDefaultSelection();
    const selected = expandDependencies(explicitSelection);
    enforceChoiceDependencies(selected, explicitSelection);
    return { explicitSelection, selected };
  }

  function renderSummaries(selected, visibleCount) {
    summaries.forEach((summary) => {
      const mode = summary.dataset.fitSummaryMode || (fitItems.length ? "shown" : "selected");
      const storageNote = storage ? "" : " Selections will reset when you leave this page.";

      if (mode === "selected") {
        const selectedCount = selected.size;
        summary.textContent =
          selectedCount === 1
            ? `1 prep job selected.${storageNote}`
            : `${selectedCount} prep jobs selected.${storageNote}`;
        return;
      }

      const itemText = visibleCount === 1 ? "1 fitment job" : `${visibleCount} fitment jobs`;
      summary.textContent = `${itemText} shown.${storageNote}`;
    });
  }

  function updateFitList() {
    const { explicitSelection, selected } = getSelectionState();
    let visibleCount = 0;

    fitItems.forEach((item) => {
      const itemParts = item.dataset.fitItem.split(/\s+/).filter(Boolean);
      const isVisible = itemParts.some((part) => selected.has(part));
      item.classList.toggle("is-fit-hidden", !isVisible);
      if (isVisible) visibleCount += 1;
    });

    emptyMessage?.classList.toggle("is-fit-hidden", visibleCount !== 0);
    renderSummaries(selected, visibleCount);

    if (choices.length) writeSelectedParts(explicitSelection);
  }

  const savedSelection = getSavedOrDefaultSelection();
  choices.forEach((choice) => {
    choice.checked = savedSelection.has(choice.dataset.builderChoice);
  });

  choices.forEach((choice) => {
    choice.addEventListener("change", updateFitList);
  });

  selectAllButton?.addEventListener("click", () => {
    choices.forEach((choice) => {
      choice.closest("[data-builder-option]")?.classList.remove("is-dependency-selected");
      choice.checked = true;
    });
    updateFitList();
  });

  clearButton?.addEventListener("click", () => {
    choices.forEach((choice) => {
      choice.closest("[data-builder-option]")?.classList.remove("is-dependency-selected");
      choice.checked = false;
    });
    updateFitList();
  });

  updateFitList();
}

initialiseDeliveryFitBuilder();

function initialiseBuilderFlow() {
  const flow = document.querySelector("[data-builder-flow]");
  if (!flow) return;

  const panels = Array.from(flow.querySelectorAll("[data-builder-panel]"));
  const stepButtons = Array.from(flow.querySelectorAll("[data-builder-step-target]"));
  const previousButton = flow.querySelector("[data-builder-prev]");
  const nextButton = flow.querySelector("[data-builder-next]");
  const checklistUrl = "delivery-prep.html#generated-checklist";

  if (!panels.length) return;

  function stepFromHash() {
    const hashValue = window.location.hash.replace("#", "");
    return panels.findIndex((panel) => panel.dataset.builderPanel === hashValue);
  }

  const initialHashIndex = stepFromHash();
  let currentIndex = Math.max(0, initialHashIndex);

  function setStep(index, updateHash = true) {
    currentIndex = Math.min(Math.max(index, 0), panels.length - 1);

    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== currentIndex;
    });

    stepButtons.forEach((button) => {
      const isCurrent = button.dataset.builderStepTarget === panels[currentIndex].dataset.builderPanel;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-current", isCurrent ? "step" : "false");
    });

    if (previousButton) previousButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.textContent = currentIndex === panels.length - 1 ? "View checklist" : "Next";

    if (updateHash) {
      const stepName = panels[currentIndex].dataset.builderPanel;
      history.replaceState(null, "", `#${stepName}`);
    }
  }

  stepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetIndex = panels.findIndex(
        (panel) => panel.dataset.builderPanel === button.dataset.builderStepTarget,
      );
      if (targetIndex >= 0) setStep(targetIndex);
    });
  });

  previousButton?.addEventListener("click", () => {
    setStep(currentIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    if (currentIndex === panels.length - 1) {
      window.location.href = checklistUrl;
      return;
    }

    setStep(currentIndex + 1);
  });

  window.addEventListener("hashchange", () => {
    const hashIndex = stepFromHash();
    if (hashIndex >= 0) setStep(hashIndex, false);
  });

  setStep(currentIndex, initialHashIndex >= 0);
}

initialiseBuilderFlow();

const searchInput = document.querySelector("#site-search");
const statusNode = document.querySelector("#search-status");
const searchableSections = Array.from(document.querySelectorAll(".searchable"));
const tableRows = Array.from(document.querySelectorAll(".searchable tbody tr"));
const listItems = Array.from(
  document.querySelectorAll(
    ".searchable li, .searchable .todo-item, .searchable .prep-item, .searchable .coverage-row",
  ),
);
const prepGroups = Array.from(document.querySelectorAll(".searchable .prep-group"));
const referenceDrawers = Array.from(document.querySelectorAll(".reference-drawer"));

if (searchInput && statusNode) {
  function normalise(value) {
    return value.toLowerCase().trim();
  }

  function isSearchVisible(item) {
    return !item.classList.contains("is-hidden") && !item.classList.contains("is-fit-hidden");
  }

  function sectionHasVisibleContent(section, query) {
    const rows = Array.from(section.querySelectorAll("tbody tr"));
    const visibleRows = rows.some((row) => !row.classList.contains("is-hidden"));
    const textBlocks = Array.from(
      section.querySelectorAll("li, .todo-item, .prep-item, .coverage-row"),
    );
    const visibleText = textBlocks.some(isSearchVisible);
    const hasStructuredContent = rows.length > 0 || textBlocks.length > 0;
    return (
      visibleRows ||
      visibleText ||
      (!hasStructuredContent && Boolean(query && normalise(section.textContent).includes(query)))
    );
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
      if (isMatch && query && !item.classList.contains("is-fit-hidden")) matches += 1;
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

    referenceDrawers.forEach((drawer) => {
      if (query && normalise(drawer.textContent).includes(query)) {
        drawer.open = true;
      }
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

const globalSearchInput = document.querySelector("#global-search");
const globalSearchStatus = document.querySelector("#global-search-status");
const globalSearchResults = document.querySelector("#global-search-results");

const GLOBAL_SEARCH_INDEX = [
  {
    title: "Start",
    url: "index.html",
    section: "Workflow launcher",
    summary:
      "Start page for choosing delivery prep, race weekend prep, spanner checks, or reference lookup.",
    keywords:
      "start home workflow launcher delivery prep race weekend spanner checks reference",
  },
  {
    title: "Delivery Prep",
    url: "delivery-prep.html",
    section: "Post-delivery checklist",
    summary:
      "What to order, fit, and check after handover: ignition switch, transponder, brake pads, half sidescreens, mirrors, anti-roll bar, fuel drain, dash timer, handbrake cover, tape, and first shakedown items.",
    keywords:
      "delivery prep car handover modifications fitment competition pads half sidescreens race mirror centre mirror front anti roll bar fuel drain dash timer handbrake cover 50mm tape anti slip gaffer",
  },
  {
    title: "Delivery Prep Checklist Builder",
    url: "delivery-prep-builder.html#builder",
    section: "Custom prep jobs",
    summary:
      "Step through body, cockpit, brakes, fuel, data, setup, and service choices to build a saved delivery prep checklist.",
    keywords:
      "delivery prep builder custom checklist choose prep jobs optional parts selected fitment edit prep jobs",
  },
  {
    title: "Prep Parts And Why They Matter",
    url: "delivery-prep.html#prep-mods",
    section: "Delivery prep buying list",
    summary:
      "Practical buying list for parts to order separately, fit after handover, or treat as conscious modifications.",
    keywords:
      "30P307E 30P307A side impact bar hardware pack WE67K half sidescreen brake pads 300B0067A 3BAB0007A master cylinder cap race cap 77175 300B0043A inertia jumper subloom 370L0003A 37E552A",
  },
  {
    title: "Driver Guide Hub",
    url: "driver-guide.html",
    section: "Guide menu",
    summary:
      "Split driver reference covering basics, car prep, safety, setup, events, rules, racecraft, and source coverage.",
    keywords:
      "driver guide menu academy basics car prep safety setup events rules racecraft source coverage",
  },
  {
    title: "Reference Hub",
    url: "reference.html",
    section: "Parts, guide, sources, and search",
    summary:
      "Reference hub for parts, driver guide pages, source coverage, global search, and the regulations PDF.",
    keywords:
      "reference hub parts driver guide sources coverage search regulations PDF",
  },
  {
    title: "Basics & Terms",
    url: "guide-basics.html",
    section: "Responsibilities, glossary, kit, and tools",
    summary:
      "Driver responsibility, key terminology, personal safety kit, essential tools, and basic car operation.",
    keywords:
      "responsibility glossary NCR final instructions scrutineer FHR HANS helmet suit tools torque wrench jack axle stands tyre pressure gauge jerry can funnel oil pressure rev limiter",
  },
  {
    title: "Car Prep Knowledge",
    url: "guide-car-prep.html",
    section: "Driver fit, bodywork, compliance, fuel, and data",
    summary:
      "Helmet clearance, seat fit, pedals, mirrors, headlight tape, windscreen tape, wheel centre caps, ride height, weight, fuel, transponder, and confirm items.",
    keywords:
      "helmet clearance 50mm cage seat washers bead seat pedals mirrors headlight tape windscreen tape wheel centre caps ride height 140mm weight 635kg ballast fuel sampling boot floor sealing transponder MyLaps TR2 extinguisher inertia switch",
  },
  {
    title: "Harness & Safety",
    url: "guide-safety.html",
    section: "Harness and arm restraints",
    summary:
      "Harness adjustment, FHR/HANS positioning, belting-in order, arm-restraint fit, and cockpit reach checks.",
    keywords:
      "harness lap straps crotch straps shoulder straps FHR HANS arm restraints wrist restraints belting in cage padding",
  },
  {
    title: "Setup & Maintenance",
    url: "guide-setup-maintenance.html",
    section: "Race setup, flat floor, and maintenance",
    summary:
      "Anti-roll bar choice, ride height, rake, camber, caster, tracking, flat-floor procedure, oil checks, brake pads, bearings, and routine maintenance.",
    keywords:
      "setup anti roll bar ARB red orange ride height rake camber caster tracking toe flat floor oil dipstick brake pads wheel bearings maintenance",
  },
  {
    title: "Events & Rules",
    url: "guide-events-rules.html",
    section: "Race weekends, sprinting, testing, flags, and rules",
    summary:
      "Event preparation, sprint notes, testing, assembly, qualifying, Parc Ferme, flag meanings, safety car, red flags, protests, and track limits.",
    keywords:
      "race weekend sprint testing sign on scrutineering assembly qualifying Parc Ferme flags yellow red green black orange safety car track limits protest appeal final instructions",
  },
  {
    title: "Racecraft",
    url: "guide-racecraft.html",
    section: "Qualifying, racing, tow, and marshalling",
    summary:
      "Qualifying approach, starts, overtaking, defending, tow, driving tips, marshalling, contact categories, and season mindset.",
    keywords:
      "qualifying starts overtaking defending tow slipstream driving tips marshalling contacts mindset",
  },
  {
    title: "Race Prep",
    url: "race-prep.html",
    section: "Event checklist",
    summary:
      "Event, session, driver-safety, before-going-out, back-in, trackside, road-driving, and scrutineering checks.",
    keywords:
      "race prep event checklist driver safety before going out extinguisher pin arm restraints helmet visor rain light brake lights transponder tyre pressure wheel nuts road driving race numbers tape",
  },
  {
    title: "Spanner Checks",
    url: "spanner-checks.html",
    section: "Workshop checklist",
    summary:
      "Torque checks, support points, pre-session checks, walkaround checks, top tips, tools, and consumables.",
    keywords:
      "spanner checks torque wheel nuts 85Nm support points trolley jack axle stands front towing eye a frame radius arms 8mm allen key impact guns wrenches brake bleed kit cable ties tape brake cleaner glass cleaner Rain X consumables",
  },
  {
    title: "Parts List",
    url: "parts.html",
    section: "Full permitted parts reference",
    summary:
      "Full list of permitted modifications, options, part numbers, supersessions, mandatory items, tyres, ballast, fuel tank, and prohibited steering rack.",
    keywords:
      "parts list permitted modifications part numbers supersession 30P307E 30P307A WE67K 300B0067A 3BAB0007A 77175 300B0043A Toyo Proxes CF2 HP Tyres ballast fuel tank prohibited 30S030A",
  },
  {
    title: "Sources & Coverage",
    url: "sources.html",
    section: "Source map and open questions",
    summary:
      "Where each PDF section is covered, how the site was cross-checked, and which items still need confirmation.",
    keywords:
      "sources coverage Driver Guide ARDS Spanner Checks PDF open questions fuel sampling boot floor sealing extinguisher visual checks source priority",
  },
];

function normaliseGlobalValue(value) {
  return value.toLowerCase().trim();
}

function scoreGlobalResult(entry, query) {
  if (!query) return 1;

  const searchableText = normaliseGlobalValue(
    `${entry.title} ${entry.section} ${entry.summary} ${entry.keywords}`,
  );
  const terms = query.split(/\s+/).filter(Boolean);
  return terms.reduce((score, term) => score + (searchableText.includes(term) ? 1 : 0), 0);
}

function renderGlobalSearchResults(query = "") {
  if (!globalSearchResults || !globalSearchStatus) return;

  const normalisedQuery = normaliseGlobalValue(query);
  const matches = GLOBAL_SEARCH_INDEX.map((entry) => ({
    ...entry,
    score: scoreGlobalResult(entry, normalisedQuery),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const visibleMatches = normalisedQuery ? matches : GLOBAL_SEARCH_INDEX.slice(0, 6);

  globalSearchResults.textContent = "";

  if (!visibleMatches.length) {
    const empty = document.createElement("p");
    empty.className = "plain-list";
    empty.textContent = "No matching pages found.";
    globalSearchResults.append(empty);
    globalSearchStatus.textContent = "No matching pages found.";
    return;
  }

  visibleMatches.forEach((entry) => {
    const article = document.createElement("article");
    const heading = document.createElement("h3");
    const link = document.createElement("a");
    const meta = document.createElement("p");
    const summary = document.createElement("p");

    article.className = "search-result";
    meta.className = "search-result-meta";
    link.href = entry.url;
    link.textContent = entry.title;
    heading.append(link);
    meta.textContent = entry.section;
    summary.textContent = entry.summary;
    article.append(heading, meta, summary);
    globalSearchResults.append(article);
  });

  if (!normalisedQuery) {
    globalSearchStatus.textContent = "Showing suggested pages.";
  } else {
    globalSearchStatus.textContent =
      visibleMatches.length === 1
        ? "Showing 1 matching page."
        : `Showing ${visibleMatches.length} matching pages.`;
  }
}

if (globalSearchInput && globalSearchResults) {
  renderGlobalSearchResults(globalSearchInput.value);
  globalSearchInput.addEventListener("input", () => {
    renderGlobalSearchResults(globalSearchInput.value);
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The site still works normally if service worker registration is blocked.
    });
  });
}
