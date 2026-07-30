# Hero video asset

`components/chrome/HeroVideo.tsx` looks for, in order:

- `orb-dictation.webm` — VP9/AV1, preferred
- `orb-dictation.mp4` — H.264 fallback

Until one exists the hero renders exactly as it did before: `HeroVideo` only
fades in on `canplay`, so a missing file is a no-op rather than a broken frame.

## Shape the file must have

The subject is a **real MacBook**, framed so the **notch** and the dictation
band molded around it are what you actually see. The composition is split
between the video and the CSS: the CSS keeps the **right ~22%** in focus and
blurs leftward, so the machine's notch has to land in that sharp region.

- **Aspect** 16:9, **1920×1080** or better, **loopable** (first and last frame
  should match — the veil hides a soft cut, not a hard one).
- **Subject on the right third**: a 14" MacBook Pro, shot close and
  three-quarter, cropped so the **top edge of the display — camera housing plus
  the menu bar right of it — sits in the right third** at roughly the frame's
  vertical middle. The band is molded around the housing; the ember-lit orb
  pulses in its right wing. The device should read as a real machine on a real
  desk: aluminium, screen reflections, shallow depth of field.
- **Left two-thirds near-empty**: the rest of the machine falling out of focus
  into dark room and slow dust drift. This is where `whisper / master`, the
  tagline and the buttons sit.
- **Palette** locked to the tokens in `app/globals.css` — ground `#07090e`,
  ember `#ff6a3d` (the human/voice light, and the only bright source in frame),
  signal `#6ee7df` used sparingly.
- **No readable text** anywhere — not on screen, not in the band. `LiveDictation`
  owns the words; text baked into a video goes stale and can't be translated.
  No hands, no people.
- **Locked-off camera.** Subject motion only (the orb breathing, dust). A moving
  camera behind fixed type reads as a stock loop.
- **Under ~4 MB** after encode; it loads in the hero.

Note: when this asset is present, `HeroAppBackdrop` — the DOM replica of the
same notch row — fades out, since the video is the photographic version of the
identical thing and two bands would depict a state the app can't be in. The
replica stays as the no-asset / reduced-motion fallback.

## Encode

```sh
ffmpeg -i source.mov -an -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 orb-dictation.webm
ffmpeg -i source.mov -an -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart orb-dictation.mp4
```

`-an` matters: the element is muted and decorative, so an audio track is dead
weight.
