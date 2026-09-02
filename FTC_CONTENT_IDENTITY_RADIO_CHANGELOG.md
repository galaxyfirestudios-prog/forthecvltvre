# FOR THE CULTURE — Content & Identity Fix
Date: September 2, 2026

## Implemented
- Connected FTC contact email: fortheculture184@gmail.com
- Connected FTC phone: +234 814 593 9698
- Connected official Instagram and X links supplied by the owner.
- Removed placeholder TikTok/YouTube social destinations from the footer/social area.
- Updated the footer/contact area to use FTC information.
- Reframed homepage metadata/copy from a music-first identity to an independent news, music, culture, entertainment and radio platform.
- Expanded top navigation to include Entertainment.
- Added a visible newsroom category strip covering Latest, Nigeria, Africa, World, Entertainment, Music, Culture, Business, Technology and Sports.
- Expanded editorial taxonomy to NEWS, MUSIC, ENTERTAINMENT, CULTURE, STYLE, FILM, ART, EVENTS, SPORTS, BUSINESS and TECHNOLOGY.
- Expanded editorial source pool with additional Nigerian, African, business, technology and sports feeds.
- Increased editorial API feed capacity to 24 stories.
- Improved radio startup so each fresh page session selects a fresh track instead of reusing the old saved GFS/FTC track index.
- Removed legacy GFS radio state fallbacks.
- Improved radio Up Next selection to avoid recently played tracks where possible.
- Preserved existing automatic track advancement and recently-played logic.
- Corrected Vercel Hobby editorial cron to once daily, matching the existing project handover.
- Left Paystack/payment API files intact.

## Validation
- Node syntax checks passed for the modified JavaScript editorial/API files.
- Full Vite production build could not be executed in this environment because dependencies were not fully installed; no source dependencies were intentionally changed.
