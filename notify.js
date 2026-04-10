require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RECIPIENT = 'lcardilli@theinfluenceagency.com';

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD in .env');
  process.exit(1);
}

function starsHtml(rating) {
  const filled = Math.round(rating || 0);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  try {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

async function main() {
  const reviewsPath = path.join(__dirname, 'reviews.json');
  if (!fs.existsSync(reviewsPath)) {
    console.log('reviews.json not found — nothing to notify.');
    return;
  }

  const allReviews = JSON.parse(fs.readFileSync(reviewsPath, 'utf8'));
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const newReviews = allReviews.filter((r) => {
    if (!r.publishedAtDate) return false;
    return new Date(r.publishedAtDate) >= cutoff;
  });

  if (newReviews.length === 0) {
    console.log('No new reviews in the last 24 hours — skipping email.');
    return;
  }

  // Group by location
  const byLocation = {};
  for (const review of newReviews) {
    if (!byLocation[review.location]) byLocation[review.location] = [];
    byLocation[review.location].push(review);
  }

  let bodyHtml = `
    <div style="font-family: Arial, sans-serif; color: #2c2c2c; max-width: 680px; margin: 0 auto;">
      <div style="background: #1a2332; padding: 24px 32px; border-bottom: 4px solid #c9a84c;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Stephen Durbin & Associates</h1>
        <p style="color: #c9a84c; margin: 4px 0 0; font-size: 14px;">New Google Reviews Digest</p>
      </div>
      <div style="padding: 24px 32px;">
        <p style="font-size: 15px; color: #555;">
          ${newReviews.length} new review${newReviews.length !== 1 ? 's' : ''} received in the last 24 hours across ${Object.keys(byLocation).length} location${Object.keys(byLocation).length !== 1 ? 's' : ''}.
        </p>
  `;

  for (const [location, reviews] of Object.entries(byLocation)) {
    bodyHtml += `
      <h2 style="color: #1a2332; font-size: 17px; border-bottom: 2px solid #c9a84c; padding-bottom: 6px; margin-top: 28px;">
        ${location}
      </h2>
    `;

    for (const r of reviews) {
      const snippet = r.text
        ? r.text.length > 300 ? r.text.substring(0, 300) + '…' : r.text
        : '<em>No text provided.</em>';

      bodyHtml += `
        <div style="border: 1px solid #e8e8e8; border-radius: 6px; padding: 16px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <strong style="font-size: 14px;">${r.reviewerName}</strong>
            <span style="color: #c9a84c; font-size: 16px; letter-spacing: 1px;">${starsHtml(r.rating)}</span>
          </div>
          <div style="color: #888; font-size: 12px; margin: 4px 0 10px;">${formatDate(r.publishedAtDate)}</div>
          <p style="font-size: 14px; margin: 0; line-height: 1.6;">${snippet}</p>
        </div>
      `;
    }
  }

  bodyHtml += `
      </div>
      <div style="background: #f5f5f5; padding: 16px 32px; text-align: center; font-size: 12px; color: #888;">
        Powered by <strong>The Influence Agency</strong> &mdash; ${new Date().toLocaleDateString('en-CA')}
      </div>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"SDA Reviews Dashboard" <${GMAIL_USER}>`,
    to: RECIPIENT,
    subject: 'New Google Reviews — Stephen Durbin & Associates',
    html: bodyHtml,
  });

  console.log(`Email sent: ${newReviews.length} new reviews to ${RECIPIENT}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
