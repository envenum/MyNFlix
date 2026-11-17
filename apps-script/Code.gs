/**
 * MyNFlix – Drive library API (Google Apps Script)
 *
 * Lists every video inside ROOT_FOLDER_ID, grouped by sub-folder (one sub-folder = one "show").
 * Runs as YOU, so the folder itself does not need to be public – but each video file must be
 * shared as "Anyone with the link" for Drive's embed player to work for viewers.
 *
 * Profiles / PINs (checked here on the server, so they are NOT in the website code):
 *   Project Settings > Script properties > Add script property
 *     Name:  PROFILES
 *     Value: {"radiation":"12345","peterpal":"23456","robotics":"34567","melodie":"45678"}
 * If PROFILES is not set, the library is open to anyone who has the URL.
 * After 5 wrong PINs for a profile it is locked for 15 minutes.
 */
const ROOT_FOLDER_ID = '1qI4VR6GwOUpBb5YA4KntRE2KMVohflO2';
const VIDEO_EXT = ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'ts', 'mpg', 'mpeg', 'wmv', 'flv'];
const CACHE_SECONDS = 45;
const MAX_FAILS = 5;
const LOCK_SECONDS = 900;

function doGet(e) {
  const params = (e && e.parameter) || {};
  const cache = CacheService.getScriptCache();

  const denied = authorize_(params, cache);
  if (denied) return json_({ error: denied });

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

// Returns null when allowed, otherwise an error code: 'unauthorized' | 'locked' | 'misconfigured'
function authorize_(params, cache) {
  const raw = PropertiesService.getScriptProperties().getProperty('PROFILES');
  if (!raw) return null;

  let profiles;
  try { profiles = JSON.parse(raw); } catch (err) { return 'misconfigured'; }

  const user = String(params.user || '').toLowerCase().trim();
  const pin = String(params.pin || '').trim();
  if (!Object.prototype.hasOwnProperty.call(profiles, user)) return 'unauthorized';

  const failKey = 'fail_' + user;
  const fails = Number(cache.get(failKey) || 0);
  if (fails >= MAX_FAILS) return 'locked';

  if (String(profiles[user]) !== pin) {
    cache.put(failKey, String(fails + 1), LOCK_SECONDS);
    return 'unauthorized';
  }
  cache.remove(failKey);
  return null;
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
