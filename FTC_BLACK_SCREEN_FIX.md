# FOR THE CULTURE — Black Screen Fix

## Root cause confirmed
The browser console showed `Uncaught ReferenceError: process is not defined` in the production JavaScript bundle. That is a browser-runtime error: the deployed bundle contains code that references the Node-style `process` global, but GitHub Pages does not provide that global.

## Fix applied
- Added a small browser-safe `process` shim to `index.html` before the Vite module loads.
- Added a Vite production/development definition for `process.env.NODE_ENV` so browser builds resolve the environment value consistently.
- No radio, editorial, payment, or API engine was rewritten.

## Tab logo
- Added `public/ftc-favicon.png`, derived from the existing FOR THE CULTURE artwork.
- Added `rel="icon"` and `apple-touch-icon` tags using a relative path so it works under the GitHub Pages `/forthecvltvre/` path.

## Important deployment note
The console also showed `editorial-feed.json` returning 404. That is separate from the black-screen crash. The site code already treats a missing feed as a recoverable condition, but the deployed Pages artifact should contain `public/editorial-feed.json` after the GitHub Actions Vite build. If it remains 404 after this fix, inspect the Pages workflow/artifact rather than changing the React app.
