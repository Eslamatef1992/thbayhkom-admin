# Thabayehkom Admin Panel

React 19 + Vite + TypeScript admin for the Thabayehkom backend. Served at `https://admin.thabayehkom.app`.

This is source code rebuilt from the compiled bundle that was previously the only thing in this repo
(kept under `legacy-dist/` for reference). Same screens and API; the three runtime patch scripts
(`banner-patch.js`, `country-patch.js`, `social-patch.js`) and `video-upload.html` are now proper
features: video banners, country flags, and social links in Settings.

## Run locally

```bash
npm install
cp .env.example .env.local      # VITE_BACKEND_URL=http://localhost:3000 (your local backend)
npm run dev                     # http://localhost:5173
```

Point `VITE_BACKEND_URL` at `https://back.thabayehkom.app` to run the local admin against production data
(careful: changes are real).

## Build & deploy

```bash
npm run build          # type-checks, then writes dist/ using .env.production (back.thabayehkom.app)
```

Upload the **contents** of `dist/` to the admin site's document root on the VPS, replacing the old files
(`index.html` + `assets/`). The old `*-patch.js` files and `video-upload.html` are no longer needed.
Because pages use `#hash` routes, no server rewrite rules are required.

Example (adjust host/path to your server):

```bash
rsync -avz --delete dist/ user@your-vps:/path/to/admin.thabayehkom.app/
```

## Structure

```
src/
  api.ts               fetch wrapper, token storage, image/video upload
  nav.ts               sidebar items + EN/AR labels
  format.ts            order status / payment labels, date helpers
  toast.tsx            notifications
  components/
    Layout.tsx         sidebar + top bar (collapsible, mobile drawer, RTL)
    CrudPage.tsx       generic list/add/edit/delete page used by most screens
    ui.tsx             Modal, ConfirmDialog, Pagination, form fields, ImageInput
  pages/               one file per area (Orders, Products, Catalog, Content, Location, System, Admin)
```
