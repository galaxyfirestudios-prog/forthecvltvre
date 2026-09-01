# FOR THE CULTURE — REDESIGN REPLACEMENT

This archive is the FTC replacement project based on the supplied baseline.

What changed:
- Replaced the Galaxy Fire Studios-facing UI with the standalone FOR THE CULTURE media/culture experience shown in the supplied handover/design.
- Preserved the existing editorial API/static-feed architecture and five-minute feed refresh.
- Preserved the browser radio playlist, persistent audio element, pause/resume behavior, smart non-repeating rotation, volume control, and navigation-accessible player.
- Kept the existing api/, public/radio/, public/radio-playlist.json, Supabase/editorial files, deployment configuration, and other baseline backend assets.
- Removed studio booking/store/Paystack UI from the FTC frontend because the handover explicitly says those are outside this FTC project.
- Updated page title/metadata for the FTC domain.

Replacement:
1. Keep a backup of the current FTC folder.
2. Unzip this archive into the FTC project folder.
3. Replace the existing project files with the archive contents.
4. Keep the existing deployment environment variables, especially the Supabase/editorial variables and VITE_RADIO_STREAM_URL if used.
5. Run the normal production build/deploy command for the project.

Important:
- Do not delete the api/ or public/ directories.
- Do not move the contents into an extra nested folder.
- The redesign intentionally keeps the existing radio/editorial engine rather than replacing it with mock/static functionality.
