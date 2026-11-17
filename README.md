# MyNFlix

A simple streaming site for your own videos in Google Drive. Built with React + Vite, hosted on GitHub Pages at https://envenum.github.io/MyNFlix/

New videos you add to the Drive folder show up automatically (the site re-checks every minute and when you return to the tab).

## How it works

1. `apps-script/Code.gs` runs in your Google account, checks the profile PIN, and lists the Drive folder as JSON (one sub-folder = one show).
2. The site fetches that list and plays each video in Drive's embed player.

## Connect Google Drive

1. Go to https://script.google.com, create a **New project**, and paste in `apps-script/Code.gs`.
2. **Project Settings > Script properties > Add** `PROFILES` = `{"radiation":"12345","peterpal":"23456","robotics":"34567","melodie":"45678"}` (use your own PINs). The PINs live only here, never in this repo.
3. **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. Copy the `/exec` URL.
4. Put the URL in `.env.production` as `VITE_DRIVE_API_URL`, and push to `main`. `.github/workflows/deploy.yml` builds and publishes the site.

After editing the script later: **Deploy > Manage deployments > pencil > Version: New version > Deploy** (keeps the same URL).

Local dev: copy `.env.example` to `.env.local`, fill in the URL, then `npm install && npm run dev`.

## Profiles

Profile names are listed in `src/lib/profiles.js`. To add one, add it there and add its PIN to the `PROFILES` script property. After 5 wrong PINs a profile is locked for 15 minutes.

## Adding videos

Drop files into a sub-folder of your Drive folder, and share each file as **Anyone with the link**. Use **MP4 (H.264 + AAC)**: Drive's player does not reliably play `.ts`, `.mkv` or `.avi`.

## Privacy

GitHub Pages is static, so video links cannot be made truly private. Videos must be link-shared for the player to work, and anyone who has a video's Drive link can watch it. The PINs only gate the library list on this site.
