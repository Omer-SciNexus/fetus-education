# A Little Sun

The app uses the earlier illustrated bonding edition as a native video. Three.js
and the unused 3D renderers have been removed. `render.mjs` now defaults to the
Canvas2D bonding edition; `--original` renders the original film.

- App film: `public/videos/a-little-sun-bonding-43s.mp4` (43 seconds).
- Source film: `public/videos/a-little-sun-bonding.mp4` (86 seconds).
- The hearing-edition MP4 files are retained as previous exports.

The app film is encoded from the source with FFmpeg `setpts=0.5*PTS`,
`atempo=2.0`, H.264/AAC, and `-movflags +faststart`. Descriptive caption timestamps
are divided by two. Stills in `public/development` are extracted from the film.

To rebuild the source film, use `node scripts/video/render.mjs --bonding`.
It requires Playwright/Chromium, Python with NumPy, and the local imageio-ffmpeg
package. `--preview` generates representative frames without a full render.
Use `node scripts/video/verify.mjs --bonding` to verify the source export.

The visual source is `scene.html`; `bonding.js` adds the symbolic voice, story,
and music chapter. Light effects express connection and do not model learning
outcomes. Approximate pregnancy stages are illustrative.
