# MyNFlix

A simple streaming site for your own videos in Google Drive. Built with React + Vite, hosted on GitHub Pages at https://envenum.github.io/MyNFlix/

New videos you add to the Drive folder show up automatically (the site re-checks every minute and when you return to the tab).

## How it works

1. `apps-script/Code.gs` runs in your Google account, checks the sign-in, and lists the Drive folder as JSON (one sub-folder = one show).
2. The site fetches that list and plays each video in Drive's embed player.

## Connect Google Drive

1. Go to https://script.google.com, create a **New project**, and paste in `apps-script/Code.gs`.
2. **Project Settings > Script properties > Add** a property named `USERS` (see below).
3. **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. Copy the `/exec` URL.
4. Put the URL in `.env.production` as `VITE_DRIVE_API_URL`, and push to `main`. `.github/workflows/deploy.yml` builds and publishes the site.

After editing the script later: **Deploy > Manage deployments > pencil > Version: New version > Deploy** (keeps the same URL).

Local dev: copy `.env.example` to `.env.local`, fill in the URL, then `npm install && npm run dev`.

## Users

Users are stored only in the Apps Script `USERS` property, never in this repo. The value is a JSON object keyed by username, each with a 5-digit `pin` and a `role` of `admin` or `user`:

```
{ "<admin name>": { "pin": "<5 digits>", "role": "admin" }, "<user name>": { "pin": "<5 digits>", "role": "user" } }
```

- **Admin:** signs in with "Admin sign-in" on the profile screen, and can add users, remove users and change PINs from the gear icon (`/#/admin`).
- **User:** picks their profile and enters a PIN to browse and play.
- **Guest:** built in, no PIN. Can only see titles and thumbnails; the server sends no video IDs, so nothing can be played.
- After 5 wrong PINs a user is locked for 15 minutes.

## Adding videos

Drop files into a sub-folder of your Drive folder, and share each file as **Anyone with the link**. Use **MP4 (H.264 + AAC)**: Drive's player does not reliably play `.ts`, `.mkv` or `.avi`.

## Privacy

GitHub Pages is static, so video links cannot be made truly private. Videos must be link-shared for the player to work, and anyone who has a video's Drive link can watch it. Sign-in only gates the library list on this site.
