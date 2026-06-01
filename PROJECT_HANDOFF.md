# Works Showcase Project Handoff

This document is for future agents taking over the "医起AI·挑战赛" works showcase project.

## Current Production URLs

- Frontend: https://works-showcase-d2giub4pr5d687848-1437802595.tcloudbaseapp.com/
- Admin: https://works-showcase-d2giub4pr5d687848-1437802595.tcloudbaseapp.com/admin.html
- API: https://works-showcase-d2giub4pr5d687848-1437802595.ap-shanghai.app.tcloudbase.com/api
- CloudBase environment: `works-showcase-d2giub4pr5d687848`

The CloudBase domain is the canonical production domain. GitHub Pages is not the production entry.

## Active Tech Stack

- Frontend: plain HTML/CSS/JavaScript
- Hosting: CloudBase static hosting
- Backend: CloudBase cloud function, Node.js 18
- Database: CloudBase MySQL / RDB REST API
- Storage: CloudBase cloud storage for uploaded work images
- Login: Feishu OIDC callback flow, then frontend stores a 30-day local login cache

No frontend build step is currently used.

## Active Files

- `index.html`
  - Production user-facing works square.
  - Contains login flow, feed rendering, detail page, comments, likes, shares, canonical domain redirect, and image hydration handling.
  - Current visual style is Apple-inspired minimal UI.
  - Active assets:
    - `logo.png`
    - `hero-bg.png`

- `admin.html`
  - Production admin page.
  - Current capabilities:
    - Password gate
    - Dashboard counts
    - Works statistics
    - User behavior list
    - Visitor list
    - CSV export
    - Work upload
    - Work deletion
  - Delete in admin removes related rows in this order:
    - `likes`
    - `comments`
    - `shares`
    - `work_stats`
    - `works`

- `functions/api/index.js`
  - Active unified backend API.
  - Uses `@cloudbase/node-sdk`, `app.mysql().fetch(...)`, and CloudBase RDB REST.
  - Handles:
    - CRUD actions: `get`, `add`, `update`, `delete`, `count`, `doc`, `upsert`
    - `upload`
    - `fileUrl`
    - `exec`
    - image URL hydration/proxying for `works`

- `functions/api/cloudbaserc.json`
  - Active CloudBase function deployment config.
  - Important: `installDependency` is currently `false`.

- `logo.png`
  - Active brand logo.

- `hero-bg.png`
  - Active login and homepage hero background.

## Deprecated Or Legacy Files

Do not treat these as production unless the user explicitly asks:

- `public/index.html`
  - Old static entry. Not production.

- `index.html.bak`
  - Backup only.

- `admin-v2.html`
  - Legacy admin candidate. Current production admin is `admin.html`.

- `server.js`, `vercel.json`
  - Old local/Vercel-style artifacts. Not used for CloudBase production.

- `test-*.js`, `test-*.html`
  - Debug/test helpers only.

- `bg.jpg`, `hero.jpg`, `hero-hd.jpg`, `hero-hd.png`
  - Historical assets. Current homepage/login background is `hero-bg.png`.

- `functions/feishu-auth/index.js`
  - Legacy Feishu auth function source.
  - Do not deploy it as-is.
  - It contains old hard-coded credentials and is not the current maintained login source in this repo.

## Database Tables In Use

The active API allows only these tables:

- `visitors`
- `works`
- `likes`
- `comments`
- `shares`
- `work_stats`

Important `works` fields:

- `id`
- `title`
- `description`
- `category`
  - `"0"` means `"医"起打擂台`
  - `"1"` means `医高人胆大`
- `creator_name`
- `images`
  - Stored as JSON string by the API.
  - Can contain image objects with `fileID`, `url`, `stableUrl`, `fileName`.
- `status`
- `like_count`
- `comment_count`
- `share_count`
- `created_at`

## API Contract

Endpoint:

```text
https://works-showcase-d2giub4pr5d687848-1437802595.ap-shanghai.app.tcloudbase.com/api
```

General JSON POST:

```json
{
  "action": "get",
  "collection": "works",
  "params": {
    "limit": 100
  }
}
```

Supported actions:

- `get`
- `add`
- `update`
- `delete`
- `count`
- `doc`
- `upsert`
- `upload`
- `fileUrl`
- `exec`

Upload endpoint:

```text
POST /api?action=upload&collection=works
```

The upload body is image binary/blob data. The API uploads to CloudBase storage and returns `fileID`, temporary `url`, and stable URL metadata.

## Image Handling

CloudBase storage is private. Do not assume stored image URLs are permanently readable.

Current flow:

1. Admin uploads image through `api?action=upload`.
2. API stores the file in CloudBase storage.
3. `works.images` stores file metadata.
4. When frontend requests `works`, `functions/api/index.js` converts image metadata into API image proxy URLs:

```text
/api?action=image&fileID=...
```

The image proxy uses `app.downloadFile(...)` inside the CloudBase function and returns the image bytes. This avoids depending on public storage read rules or expiring storage URLs.

## Login Behavior

The frontend uses Feishu OIDC.

Important current details:

- Feishu redirect URI in frontend is:

```text
https://works-showcase-d2giub4pr5d687848-1437802595.tcloudbaseapp.com/index.html
```

- Local login cache key: `loginInfo`
- Login cache TTL: `30` days
- The login overlay starts in a neutral checking/loading state so logged-in users do not see the login form flash.

Do not switch the redirect URI back to `/`; Feishu whitelist currently expects `/index.html`.

## Deployment

Use CloudBase CLI. The version used successfully was `3.5.3`.

### Deploy Static Files

From repo root:

```bash
npm_config_userconfig=/tmp/codex-empty-npmrc npx -y -p @cloudbase/cli@3.5.3 tcb hosting:deploy index.html index.html -e works-showcase-d2giub4pr5d687848
npm_config_userconfig=/tmp/codex-empty-npmrc npx -y -p @cloudbase/cli@3.5.3 tcb hosting:deploy admin.html admin.html -e works-showcase-d2giub4pr5d687848
npm_config_userconfig=/tmp/codex-empty-npmrc npx -y -p @cloudbase/cli@3.5.3 tcb hosting:deploy logo.png logo.png -e works-showcase-d2giub4pr5d687848
npm_config_userconfig=/tmp/codex-empty-npmrc npx -y -p @cloudbase/cli@3.5.3 tcb hosting:deploy hero-bg.png hero-bg.png -e works-showcase-d2giub4pr5d687848
```

If CDN cache is stale, use a cache-busting query string when verifying:

```text
https://works-showcase-d2giub4pr5d687848-1437802595.tcloudbaseapp.com/?v=check
```

### Deploy API Function

From `functions/api`:

```bash
npm install
npm_config_userconfig=/tmp/codex-empty-npmrc npx -y -p @cloudbase/cli@3.5.3 tcb fn deploy api --force
```

Deployment config is in `functions/api/cloudbaserc.json`.

Important:

- The current config uses `installDependency: false`.
- Make sure dependencies exist locally before deployment.
- The function runs in the configured VPC/subnet so it can reach RDB.

## Verification Checklist

After frontend changes:

- Open production URL with a cache-busting query.
- Verify logged-in users do not see the login form flash.
- Verify cards render images.
- Verify mobile width has no horizontal overflow.
- Verify detail page opens and comments render in detail page.
- Verify share count increments after copy/share.
- Verify logo and hero background load.

After admin changes:

- Open `/admin.html`.
- Enter admin password.
- Verify dashboard loads data.
- Verify upload still writes a work.
- Verify delete button appears in Works Statistics.
- For delete flow, first test by clicking delete and choosing Cancel.
- Only delete real data when the user explicitly asks.

After API changes:

- Verify `get works` returns image objects whose `url` uses `action=image`.
- Verify upload returns `fileID` and a readable URL.
- Verify deleting related rows works by `query: { work_id }`.

## Security Notes

- Do not commit new secrets, Feishu app secrets, CloudBase tokens, GitHub tokens, or admin passwords into documentation.
- Credentials previously shared in chat should be treated as exposed and rotated if this project becomes public or production-sensitive.
- `functions/feishu-auth/index.js` contains legacy hard-coded credentials. Do not deploy it without removing secrets.

## Current Known Quirks

- `index.html` and `admin.html` are single-file apps and contain some historical override blocks. The final definitions later in the files win at runtime.
- The active frontend is CloudBase hosting, not GitHub Pages.
- The API `exec` action exists for debugging; avoid using it unless absolutely necessary.
- Admin deletion removes database rows but does not currently delete CloudBase storage files for work images.
- Work images are served through the API image proxy because direct CloudBase storage URLs can return 403 when the bucket is private.
