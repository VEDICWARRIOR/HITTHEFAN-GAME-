# HIT THE FAN

Tap hard. Spin fast. Push the fan past its limit.

HIT THE FAN is a mobile-first 3D arcade game built with Vite and Three.js. Every run has a slightly different RPM limit, the fan can break near the danger zone, and players earn coins to unlock upgrades, fan skins, and background themes.

## Features

- 3D ceiling fan scene with sparks, smoke, debris, screen shake, and danger glow
- Tap-to-accelerate gameplay with randomized run limits
- Persistent coins, best score, best RPM, upgrades, fan skins, and backgrounds
- Web Audio sound design with changing tap tones, fan hum, warning beeps, upgrade sounds, and destruction effects
- Mobile-style UI inspired by the supplied game concept image
- Static build output suitable for GitHub Pages, Netlify, Vercel, or a Capacitor Android wrapper

## Tech Stack

- Vite
- Three.js
- Vanilla JavaScript, HTML, and CSS
- Web Audio API

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## Controls

- Tap the fan or screen to increase RPM.
- Keep tapping to enter the danger zone.
- The fan breaks randomly near the limit.
- Earn coins after destruction.
- Spend coins on upgrades, fans, and backgrounds.

## Publishing Notes

This repository is ready for GitHub as a static Vite game. Before a public release, update repository links, add final app icons/screenshots, and confirm the license choice.

For GitHub Pages, build with `npm run build` and publish the `dist/` folder using your preferred GitHub Pages workflow.
