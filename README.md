Southside Distro

A responsive front-end demo for independent artists to organise music release details. The visual identity is inspired by Southern Nigeria's independent music scene.

> **Demo only:** Release information stays in the current browser. Nothing is uploaded to a distributor or delivered to Spotify, Apple Music, YouTube Music, Audiomack, or any other platform.

## Features

- Artist dashboard with catalogue totals, upcoming releases, recent activity, and quick actions
- Release form with inline validation, release-date checks, and a live preview
- Cover-art presets and image uploads resized in the browser before saving
- Draft autosave and release persistence with browser `localStorage`
- Release catalogue with search, type filters, sorting, editing, and removal confirmation
- Local reference codes, JSON export, and printable receipts
- Static **Pending** demo status; no simulated review or approval
- Responsive layout, keyboard shortcuts, theme toggle, and reduced-motion support

## Run locally

1. Download or clone this repository.
2. Keep `index.html`, `style.css`, and `script.js` together in the same folder.
3. Open `index.html` in a modern browser.

No framework, dependency installation, build command, or backend is required.

## Publish with GitHub Pages

1. Push the project files to a GitHub repository.
2. Open the repository's **Settings → Pages**.
3. Under the build and deployment settings, choose **Deploy from a branch**.
4. Select the branch you want to publish and the folder containing `index.html` (usually `/ (root)`), then save.
5. When deployment finishes, use the Pages URL shown in the repository settings to share the live demo.

If the app files are inside a subfolder, choose that folder as the publishing source or move the three app files to the repository root.

## Important limitations

- Data is stored per browser and device. It is not an online account, cloud backup, or shared database.
- The audio field stores a link only; the app does not upload or play a release file.
- Selecting platforms records the artist's intended destinations only.
- Status remains **Pending** and is labelled as demo status because no review process is connected.
- Browser storage has limited capacity. Uploaded artwork is compressed, but storage can still fill up.
- Google Fonts and Unsplash images load from their providers over the internet.

## Keyboard shortcuts

- `1` — Dashboard
- `2` — Submit a release
- `3` — My Releases
- `N` — New release
- `/` — Search releases
- `Esc` — Close the confirmation view

Shortcuts are disabled while typing in a form control.

## Project files

- `index.html` — page structure and content
- `style.css` — design, responsive layout, and animations
- `script.js` — validation, interactions, and browser-local storage
