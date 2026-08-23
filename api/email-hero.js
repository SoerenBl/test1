const sharp = require('sharp');

// Serves the current hero.jpg pre-cropped/compressed to the confirmation
// email's banner shape (1200x521 @2x, matching the design approved in the
// artifact preview) -- fetched fresh from the live site on every request
// (not a bundled copy: Vercel's Node function bundle doesn't automatically
// include arbitrary repo files, only what it can trace as JS dependencies,
// so reading hero.jpg off the local filesystem here isn't reliable --
// fetching it the same way a browser would sidesteps that entirely), so
// replacing hero.jpg on the site is all it takes to change the email
// banner too, no code change or redeploy of this function required.
// Cover-fit anchored to the top edge, same crop CSS
// "background-size:cover; background-position:top" would give a browser,
// just done server-side because email's only reliable way to show a
// cropped photo is a pre-cropped file (Outlook doesn't support
// object-fit at all).
const SITE_BASE_URL = (process.env.SITE_BASE_URL || 'https://test1-three-peach-63.vercel.app').replace(/\/+$/, '');
const WIDTH = 1200;
const HEIGHT = 521; // 2.3:1, matches the design's banner aspect ratio

module.exports = async function handler(req, res) {
  try {
    const heroRes = await fetch(SITE_BASE_URL + '/hero.jpg');
    if (!heroRes.ok) {
      throw new Error('hero.jpg fetch failed with status ' + heroRes.status);
    }
    const src = Buffer.from(await heroRes.arrayBuffer());

    const buffer = await sharp(src)
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'top' })
      .jpeg({ quality: 68, mozjpeg: true })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    // Long-lived cache -- every recipient's mail client (and Vercel's own
    // edge cache) can reuse this instead of re-invoking the function on
    // every single email open; a redeploy with a new hero.jpg naturally
    // busts it once the cache window rolls over.
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('email-hero generation failed:', err);
    return res.status(502).send('');
  }
};

module.exports.config = { maxDuration: 15 };
