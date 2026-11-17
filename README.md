# MyNFlix

A simple streaming site for your own videos in Google Drive. Built with React + Vite, hosted on GitHub Pages at https://envenum.github.io/MyNFlix/

New videos you add to the Drive folder show up automatically (the site re-checks every minute and when you return to the tab).

## How it works

1. `apps-script/Code.gs` runs in your Google account and lists the Drive folder as JSON (one sub-folder = one show).
2. The site fetches that list and plays each video in Drive's embed player.

## Connect Google Drive

1. Go to https://script.google.com, create a **New project**, and paste in `apps-script/Code.gs`.
2. Check `ROOT_FOLDER_ID` at the top (already set to your folder).
3. Optional: **Project Settings > Script properties > Add** `PASSWORD` = a password. The site will then ask for it.
4. **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. Authorize when asked, then copy the `/exec` URL.
5. In your GitHub repo: **Settings > Secrets and variables > Actions > Variables > New repository variable**. Name `DRIVE_API_URL`, value = the `/exec` URL.
6. **Settings > Pages > Source: GitHub Actions**.
7. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes the site.

Local dev: copy `.env.example` to `.env.local`, fill in the URL, then `npm install && npm run dev`.

## Adding videos

Drop files into a sub-folder of your Drive folder, and share each file as **Anyone with the link** (select the files > Share > General access). Use **MP4 (H.264 + AAC)**: Drive's player does not reliably play `.ts`, `.mkv` or `.avi`.

## Privacy

GitHub Pages is static, so this is not truly private. Videos must be link-shared for the player to work, and anyone with a video's link can watch it. The optional `PASSWORD` only hides the library list on the site; it does not protect the video links themselves.
