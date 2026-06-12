# Publishing Checklist

## GitHub

- Create a new GitHub repository.
- Commit source files, `README.md`, `LICENSE`, `.gitignore`, `CONTRIBUTING.md`, and `docs/`.
- Do not commit `node_modules/`.
- Run `npm run build` before tagging a release.
- Add screenshots or a short gameplay GIF to the README when final art is ready.

## Static Web Release

- Run `npm run build`.
- Deploy `dist/` to GitHub Pages, Netlify, Vercel, or another static host.
- Test on mobile and desktop.
- Confirm audio starts only after the first user tap.

## Android / Play Store Preparation

- Wrap the Vite build with Capacitor or another WebView shell.
- Add final app icon, adaptive icon, splash screen, and store screenshots.
- Set production package name, app version, and signing key.
- Test offline launch, pause/resume, orientation, vibration, and audio behavior.
- Prepare privacy policy if analytics, ads, or data collection are added.
- Verify all art and sound assets are owned or licensed for commercial distribution.

## Release Quality

- Confirm no console errors in the browser.
- Confirm local save data migration works from older versions.
- Test new player state with empty localStorage.
- Test returning player state with coins, upgrades, skins, and themes.
