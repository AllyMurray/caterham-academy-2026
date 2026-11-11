# Caterham Academy Prep

Static GitHub Pages site for 2026 Caterham Academy delivery prep, driver
knowledge, race prep, spanner checks, and permitted parts reference.

- `index.html`: task-focused start page.
- `delivery-prep.html`: delivery prep guide and modification shortlist.
- `reference.html`: reference hub for parts, guide pages, sources, and search.
- `driver-guide.html`: driver guide hub covering the supplied Academy PDFs.
- `guide-*.html`: focused driver guide pages for basics, car prep, safety,
  setup, events/rules, and racecraft.
- `sources.html`: source coverage map and open confirmation items from the PDFs.
- `search.html`: global site search across the static guide pages.
- `race-prep.html`: race event, session, safety kit, and scrutineering checklist.
- `parts.html`: full permitted modifications, options, and part-number reference.
- `spanner-checks.html`: workshop spanner checks, support points, and visual checks.
- `manifest.webmanifest` and `service-worker.js`: progressive web app metadata and
  offline caching.

## Local Preview

The shared navigation is present in every HTML page. `styles.css` holds the content
components; `layout.css` defines the responsive sidebar, page headers, reading layout,
and mobile tables. Checklist storage keys and list order must stay stable so saved
progress survives presentation changes.

Site search indexes the actual section content and links directly to heading IDs.
After editing HTML content, regenerate its offline index:

```sh
python3 scripts/build-search-index.py
```

Open any of the HTML pages directly in a browser, or serve the directory with
any static file server.

## Tests

Install dependencies once, then run the Playwright regression suite:

```sh
npm install
npx playwright install chromium
npm run check
```

The tests cover the Delivery Prep builder and saved selections, all 16 pages at
desktop/tablet/phone widths, internal links, mobile navigation, section search,
workshop progress, and offline search/navigation.

## GitHub Pages

This repository includes a GitHub Actions workflow that publishes the root static
site to GitHub Pages after the test suite passes. In the repository settings, set
Pages to use GitHub Actions as the source.

## Progressive Web App

The site can be installed from supported browsers and caches the local pages,
stylesheet, script, manifest, and icons for offline use. External Caterham Parts
and regulations links still require a network connection.
