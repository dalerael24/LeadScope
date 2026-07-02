# LeadScope

LeadScope is a static, privacy-conscious workspace for public-source professional lead research. It helps a researcher define a business lead, generate live web-search queries, log dated sources, compare up to three possible identity matches, record legitimate professional contact paths, and export a cited Markdown brief.

The site is designed for GitHub Pages and contains no backend, database, account system, API keys, or persistent browser storage.

## What LeadScope must not be used for

Do not use LeadScope for stalking, harassment, doxxing, personal surveillance, private contact discovery, or research into a person's private life. Do not enter or collect private personal emails, private phone numbers, home addresses, family details, government identifiers, leaked records, private social-media content, or sensitive personal data.

Use it only for legitimate professional outreach based on public business information.

## Run locally

No build step is required.

1. Open `index.html` in a browser, or serve the folder with a basic static server.
2. Complete Lead Setup and confirm the professional-outreach checkbox.
3. Open the generated research queries and record relevant public sources.
4. Compare candidate matches, select a primary candidate, and review the generated brief.
5. Copy or export the final report as Markdown.

Example local server with Python:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Add source links

In Research Desk, choose **Add source** and provide:

- The source type
- The publication or source date
- The complete public URL
- The specific claim or finding supported by that page

Each factual claim in an outreach-ready brief should trace to a source. The interface flags sources older than two years and records missing dates as stale.

## Confidence scoring

Candidate identity scores follow these review bands:

- 90 to 100: confirmed by an official company source or official professional profile plus another strong source
- 70 to 89: strong match with one key confirmation still missing
- 50 to 69: possible match supported by partial evidence
- Below 50: do not treat the person as identified

The report's evidence-quality score is a coverage indicator, not an identity decision. It rewards current, high-quality sources, candidate comparison, and an official contact path. A human must still review every conclusion.

## Contact-data rules

Prioritize official company contact pages, inquiry forms, staff directories, professional bios, and professional profiles.

A public business email may be recorded only when the exact address is clearly published on a legitimate public source such as an official company page, press release, or professional bio. If a corporate pattern is inferred from public corporate examples, label it **Unverified corporate email pattern** and verify it before outreach. Never present a pattern as a confirmed address.

Do not use leaked databases, private dumps, harassment-style people-search sites, personal-address services, or private phone lookup tools.

## Privacy limitations

- Data exists only in JavaScript memory for the current browser tab.
- LeadScope does not use `localStorage`, `sessionStorage`, cookies, IndexedDB, analytics, or a remote database.
- Closing or refreshing the tab clears the research session.
- **Clear all data** immediately resets the interface state.
- Search links open a third-party search engine. That service has its own privacy policy.
- Markdown export and clipboard copy are user-initiated local actions.
- The application does not validate that a pasted source actually supports a claim. Manual review is required.

## Safe future API integration

Any future enrichment or search integration should run through a server-side service so credentials never appear in client JavaScript. Use narrowly scoped API credentials, explicit allowlists for source types, rate limits, audit logging that excludes personal data, deletion controls, and a human approval step before contact data is shown. Do not add API keys to this repository or expose secrets through GitHub Pages.

Prefer official company, regulator, filing, licensed news, and public professional-profile APIs. Do not integrate data brokers or services built around private-person lookup.

## GitHub Pages

Publish from the repository root on the default branch. The expected files are:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

No GitHub Actions workflow is required.
