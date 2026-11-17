/**
 * MyNFlix – Drive library API (Google Apps Script)
 *
 * Lists every video inside ROOT_FOLDER_ID, grouped by sub-folder (one sub-folder = one "show").
 * Runs as YOU, so the folder itself does not need to be public – but each video file must be
 * shared as "Anyone with the link" for Drive's embed player to work for viewers.
 *
 * Users live in a Script property (never in the website code or this repo):
 *   Project Settings > Script properties > Add script property
 *     Name:  USERS
 *     Value: JSON object, one entry per user, each with a 5-digit "pin" and a "role"
 *            ("admin" or "user"). See README for the shape.
 * The built-in "guest" profile needs no entry: it can only see titles and thumbnails.
 * Admins can add/remove users and change PINs from the site (/#/admin).
 * After 5 wrong PINs a user is locked for 15 minutes.
 */
const ROOT_FOLDER_ID = '1qI4VR6GwOUpBb5YA4KntRE2KMVohflO2';
const VIDEO_EXT = ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'ts', 'mpg', 'mpeg', 'wmv', 'flv'];
const CACHE_SECONDS = 45;
const GUEST_CACHE_SECONDS = 600;
const MAX_FAILS = 5;
const LOCK_SECONDS = 900;
const GUEST_ID = 'guest';

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'library';
  const cache = CacheService.getScriptCache();

  const users = getUsers_();
  if (!users) return json_({ error: 'misconfigured' });

  if (action === 'profiles') return json_({ profiles: profiles_(users) });

  const auth = authorize_(p, users, cache);
  if (auth.error) return json_({ error: auth.error });

  if (action === 'library') return library_(auth.role, p, cache);

  if (auth.role !== 'admin') return json_({ error: 'forbidden' });
  return json_(admin_(action, p, users, cache));
}

/* ---------- users & auth ---------- */

function getUsers_() {
  const raw = PropertiesService.getScriptProperties().getProperty('USERS');
  if (!raw) return null;
  try {
    const users = JSON.parse(raw);
    return users && typeof users === 'object' ? users : null;
  } catch (err) {
    return null;
  }
}

function hasOwn_(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// Public list for the profile picker: regular users + guest (admins are not listed).
function profiles_(users) {
  const out = Object.keys(users)
    .filter(function (id) { return users[id].role !== 'admin'; })
    .sort()
    .map(function (id) { return { id: id, role: 'user' }; });
  out.push({ id: GUEST_ID, role: 'guest' });
  return out;
}

// Returns {user, role} when allowed, otherwise {error: 'unauthorized' | 'locked'}
function authorize_(p, users, cache) {
  const user = String(p.user || '').toLowerCase().trim();
  if (user === GUEST_ID) return { user: user, role: 'guest' };
  if (!hasOwn_(users, user)) return { error: 'unauthorized' };

  const failKey = 'fail_' + user;
  const fails = Number(cache.get(failKey) || 0);
  if (fails >= MAX_FAILS) return { error: 'locked' };

  if (String(users[user].pin) !== String(p.pin || '').trim()) {
    cache.put(failKey, String(fails + 1), LOCK_SECONDS);
    return { error: 'unauthorized' };
  }
  cache.remove(failKey);
  return { user: user, role: users[user].role === 'admin' ? 'admin' : 'user' };
}

/* ---------- admin actions ---------- */

function listUsers_(users) {
  return Object.keys(users).sort().map(function (id) {
    return { id: id, role: users[id].role === 'admin' ? 'admin' : 'user' };
  });
}

function admin_(action, p, users, cache) {
  if (action === 'listUsers') return { users: listUsers_(users) };

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const name = String(p.name || '').toLowerCase().trim();
    const pin = String(p.newpin || '').trim();

    if (action === 'addUser') {
      if (!/^[a-z0-9_]{2,20}$/.test(name) || name === GUEST_ID) return { error: 'bad_name' };
      if (hasOwn_(users, name)) return { error: 'exists' };
      if (!/^\d{5}$/.test(pin)) return { error: 'bad_pin' };
      users[name] = { pin: pin, role: 'user' };
    } else if (action === 'removeUser') {
      if (!hasOwn_(users, name)) return { error: 'not_found' };
      if (users[name].role === 'admin') return { error: 'protected' };
      delete users[name];
    } else if (action === 'setPin') {
      if (!hasOwn_(users, name)) return { error: 'not_found' };
      if (!/^\d{5}$/.test(pin)) return { error: 'bad_pin' };
      users[name].pin = pin;
      cache.remove('fail_' + name);
    } else {
      return { error: 'unknown_action' };
    }

    PropertiesService.getScriptProperties().setProperty('USERS', JSON.stringify(users));
    return { users: listUsers_(users) };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- library ---------- */

function library_(role, p, cache) {
  const guest = role === 'guest';
  const key = guest ? 'library_guest' : 'library';

  let body = p.fresh ? null : cache.get(key);
  if (!body) {
    const full = buildLibrary_();
    body = JSON.stringify(guest ? toGuest_(full) : full);
    try { cache.put(key, body, guest ? GUEST_CACHE_SECONDS : CACHE_SECONDS); } catch (err) { /* too large to cache */ }
  }
  // body is a JSON object string; prepend the caller's role without re-parsing
  const out = '{"role":"' + role + '",' + body.slice(1);
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function buildLibrary_() {
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
  return { updated: new Date().toISOString(), shows: shows };
}

// Guests get titles and one thumbnail per show only: no Drive file or folder IDs, so nothing to play.
function toGuest_(full) {
  return {
    updated: full.updated,
    shows: full.shows.map(function (s, i) {
      return {
        id: 's' + i,
        name: s.name,
        count: s.episodes.length,
        thumb: thumb_(s.episodes[0].id),
        episodes: s.episodes.map(function (ep) { return { name: ep.name, ext: ep.ext }; }),
      };
    }),
  };
}

function thumb_(fileId) {
  try {
    const blob = DriveApp.getFileById(fileId).getThumbnail();
    if (!blob) return '';
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (err) {
    return '';
  }
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
function setupUsers() {
  PropertiesService.getScriptProperties().setProperty('USERS', JSON.stringify({
    radiation: { pin: '70985', role: 'user' },
    peterpal:  { pin: '10255', role: 'user' },
    robotics:  { pin: '36244', role: 'user' },
    melodie:   { pin: '48696', role: 'user' },
    admin:     { pin: '20112', role: 'admin' },
  }));
}
