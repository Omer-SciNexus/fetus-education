# A Little Sun in the app

Explore and the homepage use a native HTML video player. The film is
`public/videos/a-little-sun-bonding-43s.mp4`, shortened from the earlier
`a-little-sun-bonding.mp4`. No Three.js or WebGL renderer is used.

The 43-second film retains the complete illustrated growth, voice, story, music,
and sunrise sequence. It uses FFmpeg `setpts=0.5*PTS` and `atempo=2.0` with H.264/AAC
and fast-start metadata. The original 86-second file remains available.

Chapter selection, seeking, pause/replay, and optional sound use the video element.
Playback pauses offscreen or in a hidden tab. Reduced motion, data saving, low
memory, and failed video loads use frames extracted directly from the film.
Explore respects the member's paused pregnancy-content setting.

Tests in `tests/e2e/development.spec.ts` use isolated member data without database
writes and cover playback, sound, stages, fallback behavior, and responsive widths.
