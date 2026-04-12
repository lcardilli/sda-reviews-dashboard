require('dotenv').config();
const { ApifyClient } = require('apify-client');
const fs = require('fs');
const path = require('path');

const clients = require('./clients.json');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error('Missing APIFY_TOKEN in .env');
  process.exit(1);
}

const apify = new ApifyClient({ token: APIFY_TOKEN });

async function scrapeLocation(location) {
  console.log(`Scraping: ${location.name} (${location.kgmid})`);

  // Use a direct Maps URL (maps.app.goo.gl) if available — this guarantees
  // we hit the exact GBP. Fall back to name-based search if not yet set.
  let mapsUrl;
  if (location.directUrl) {
    mapsUrl = location.directUrl;
  } else {
    const query = encodeURIComponent(`Stephen Durbin & Associates ${location.name}`);
    mapsUrl = `https://www.google.com/maps/search/${query}/`;
  }

  const run = await apify.actor('compass/google-maps-reviews-scraper').call({
    startUrls: [{ url: mapsUrl }],
    maxReviews: 500,
    maxCrawledPlacesPerSearch: 1,
    reviewsSort: 'newest',
    language: 'en',
  });

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();

  return items.map((item) => ({
    location: location.name,
    address: location.address,
    kgmid: location.kgmid,
    reviewId: item.reviewId || item.id || null,
    reviewerName: item.reviewerName || item.name || 'Anonymous',
    reviewerPhotoUrl: item.reviewerPhotoUrl || null,
    rating: item.stars || item.rating || null,
    text: item.text || item.reviewText || '',
    publishedAtDate: item.publishedAtDate || item.date || null,
    responseFromOwnerText: item.responseFromOwnerText || null,
    responseFromOwnerDate: item.responseFromOwnerDate || null,
  }));
}

async function main() {
  const allReviews = [];

  for (const location of clients) {
    if (location.skip) {
      console.log(`Skipping: ${location.name} (no directUrl, SAB with 0 reviews)`);
      continue;
    }
    try {
      const reviews = await scrapeLocation(location);
      console.log(`  -> Got ${reviews.length} reviews for ${location.name}`);
      allReviews.push(...reviews);
    } catch (err) {
      console.error(`  -> Error scraping ${location.name}:`, err.message);
    }
  }

  const outputPath = path.join(__dirname, 'reviews.json');
  fs.writeFileSync(outputPath, JSON.stringify(allReviews, null, 2));
  console.log(`\nSaved ${allReviews.length} total reviews to reviews.json`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
