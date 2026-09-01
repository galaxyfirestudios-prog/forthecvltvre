# FOR THE CULTURE — Artist Submission Portal Update

Updated against the latest working Galaxy Fire Studios / FOR THE CULTURE build supplied on August 24, 2026.

## Changes

1. **New Music panel**
   - Expanded the existing music classifier to inspect category, headline/title, dek, source title and source excerpt.
   - Prefers distinct music stories, but falls back to music stories already appearing in Latest Stories instead of showing an empty New Music panel when the feed is small.
   - No new search engine or editorial feed was introduced.

2. **Desktop FOR THE CULTURE navigation**
   - HOME / STORIES / DISCOVER tabs are hidden on desktop (801px+).
   - Mobile/tablet navigation remains available for convenient section jumping.

3. **Artist Submission Portal**
   - Added a native FOR THE CULTURE music submission section.
   - Artists can request consideration for **Radio**, **Blog / Editorial**, or **Both**.
   - Required: artist name, email, song title, genre, and either an audio upload or streaming/download link.
   - Optional: country, city, release date, social links, artwork, bio and song description.
   - Audio uploads: MP3/WAV/M4A/AAC/OGG/WebM up to 4 MB.
   - Artwork uploads: JPG/PNG/WebP up to 2 MB.
   - Larger songs can be submitted through the streaming/download link field.
   - Uploaded files are stored in a private Supabase Storage bucket named `for-the-culture-artist-submissions`.
   - The review email is **fortheculture184@gmail.com**.
   - The existing Resend configuration is reused; `FOR_THE_CULTURE_SUBMISSION_EMAIL` is documented as an optional environment override.
   - Submission emails include signed review/download links that remain valid for 30 days.
   - A honeypot field is included to reduce basic automated spam.

## Server routes added

- `POST /api/artist-upload` — stores an uploaded audio/artwork file in private Supabase Storage.
- `POST /api/artist-submission` — validates the submission, creates temporary review links and sends the submission to the FOR THE CULTURE inbox.

## Security notes

- Supabase service-role credentials are server-only and are never placed in frontend code.
- Artist files are stored in a private bucket.
- Review links are time-limited.
- Submission does not automatically publish music or add it to radio; it is explicitly marked **UNDER REVIEW**.
