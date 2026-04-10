# SDA Reviews Dashboard

Google Reviews dashboard for **Stephen Durbin & Associates** — 11 Ontario locations.

Built by [The Influence Agency](https://theinfluenceagency.com).

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add your `.env` file

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `APIFY_TOKEN` | Your Apify API token — [get it here](https://console.apify.com/account/integrations) |
| `GMAIL_USER` | Gmail address used to send digest emails |
| `GMAIL_APP_PASSWORD` | 16-character Gmail App Password — [generate one here](https://myaccount.google.com/apppasswords) (requires 2FA enabled) |

### 3. Run the scraper manually

```bash
npm run scrape
```

This will:
1. Loop through all 11 locations in `clients.json`
2. Fetch up to 50 reviews per location via the Apify `compass/google-maps-reviews-scraper` actor
3. Save all results to `reviews.json`
4. Send a digest email to `lcardilli@theinfluenceagency.com` if any reviews were posted in the last 24 hours

---

## Dashboard

Open `index.html` in a browser (or visit the Vercel deployment) after running the scraper. The page reads `reviews.json` at load time — no backend required.

---

## GitHub Actions — Daily Cron (8am EST)

Create `.github/workflows/scrape.yml` in your repository:

```yaml
name: Daily Reviews Scrape

on:
  schedule:
    # 8am EST = 13:00 UTC
    - cron: '0 13 * * *'
  workflow_dispatch: # allow manual runs

jobs:
  scrape:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run scraper and notifier
        env:
          APIFY_TOKEN: ${{ secrets.APIFY_TOKEN }}
          GMAIL_USER: ${{ secrets.GMAIL_USER }}
          GMAIL_APP_PASSWORD: ${{ secrets.GMAIL_APP_PASSWORD }}
        run: npm run scrape

      - name: Commit updated reviews.json
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add reviews.json
          git diff --staged --quiet || git commit -m "chore: update reviews.json [skip ci]"
          git push
```

Then add your secrets in **GitHub → Settings → Secrets and variables → Actions**:
- `APIFY_TOKEN`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

> The workflow commits the updated `reviews.json` back to the repo, which triggers a fresh Vercel deployment automatically (if your repo is linked to Vercel).

---

## Project Structure

```
sda-reviews-dashboard/
├── clients.json        # 11 SDA locations with kgmid identifiers
├── scraper.js          # Apify scraper — writes reviews.json
├── notify.js           # Gmail digest notifier
├── index.html          # Frontend dashboard (reads reviews.json)
├── reviews.json        # Scraped reviews data (auto-generated)
├── package.json
├── vercel.json         # Vercel static serving config
├── .env.example        # Required environment variables
└── .gitignore
```
