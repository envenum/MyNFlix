/**
 * MyNFlix – Drive library API (Google Apps Script)
 *
 * Lists every video inside ROOT_FOLDER_ID, grouped by sub-folder (one sub-folder = one "show").
 * Runs as YOU, so the folder itself does not need to be public – but each video file must be
 * shared as "Anyone with the link" for Drive's embed player to work for viewers.
 *
 * Setup: see README ("Connect Google Drive").
 * Optional password: Project Settings > Script properties > add PASSWORD = yourpassword
 */
const ROOT_FOLDER_ID = '1qI4VR6GwOUpBb5YA4KntRE2KMVohflO2';
const VIDEO_EXT = ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'ts', 'mpg', 'mpeg', 'wmv', 'flv'];
const CACHE_SECONDS = 45;

function doGet(e) {
  const params = (e && e.parameter) || {};
  const password = PropertiesService.getScriptProperties().getProperty('PASSWORD');
  if (password && params.key !== password) return json_({ error: 'unauthorized' });

  const cache = CacheService.getScriptCache();
  if (!params.fresh) {
    const hit = cache.get('library');
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  }

  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const shows = [];

  const folders = root.getFolders();
  while (folders.hasNext()) {
    const folder = folders.next();
    const episodes = collectVideos_(folder, '');
    if (episodes.length) shows.push({ id: folder.getId(), name: folder.getName().trim(), episodes: episodes });
  }

  const loose = collectVideos_(root, '', true);
  if (loose.length) shows.push({ id: 'other', name: 'Other', episodes: loose });

  shows.sort(function (a, b) { return a.name.localeCompare(b.name); });

  const body = JSON.stringify({ updated: new Date().toISOString(), shows: shows });
  try { cache.put('library', body, CACHE_SECONDS); } catch (err) { /* too large to cache */ }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function collectVideos_(folder, prefix, skipSubfolders) {
  let out = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName();
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (VIDEO_EXT.indexOf(ext) === -1 && f.getMimeType().indexOf('video/') !== 0) continue;
    out.push({
      id: f.getId(),
      name: prefix + name,
      ext: ext,
      size: f.getSize(),
      added: f.getDateCreated().toISOString(),
    });
  }
  if (!skipSubfolders) {
    const subs = folder.getFolders();
    while (subs.hasNext()) {
      const sub = subs.next();
      out = out.concat(collectVideos_(sub, prefix + sub.getName() + ' / '));
    }
  }
  return out;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
