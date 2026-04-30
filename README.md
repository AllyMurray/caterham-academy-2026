# Caterham Academy Prep

Static GitHub Pages site for 2026 Caterham Academy delivery prep, driver
knowledge, race prep, spanner checks, and permitted parts reference.

- `index.html`: delivery prep guide and modification shortlist.
- `driver-guide.html`: driver guide hub covering the supplied Academy PDFs.
- `guide-*.html`: focused driver guide pages for basics, car prep, safety,
  setup, events/rules, and racecraft.
- `race-prep.html`: race event, session, safety kit, and scrutineering checklist.
- `parts.html`: full permitted modifications, options, and part-number reference.
- `spanner-checks.html`: workshop spanner checks, support points, and visual checks.
- `manifest.webmanifest` and `service-worker.js`: progressive web app metadata and
  offline caching.

## Local Preview

Open any of the HTML pages directly in a browser, or serve the directory with
any static file server.

## GitHub Pages

This repository includes a GitHub Actions workflow that publishes the root static
site to GitHub Pages. In the repository settings, set Pages to use GitHub Actions
as the source.

## Progressive Web App

The site can be installed from supported browsers and caches the local pages,
stylesheet, script, manifest, and icons for offline use. External Caterham Parts
and regulations links still require a network connection.
