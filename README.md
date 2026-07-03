# Whisper Master — Waitlist Landing Page

Dark, premium "calm tech" landing page for **Whisper Master**, an on-device voice-to-text app.
Built to look like a funded, shipping product for a YC pitch.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · React Three Fiber.

**Wedge:** 100% on-device / zero-retention privacy — the clean differentiator against cloud-only incumbents.

---

## Quick start

```bash
pnpm install
pnpm run dev      # http://localhost:3000
```

Production:

```bash
pnpm run build && pnpm run start
```

The WebGL/3D deps are already in `package.json`. If you want the exact line for the
3D module on its own:

```bash
pnpm install three @react-three/fiber @react-three/drei
pnpm install -D @types/three
```

---

## Project structure

```
app/
  layout.tsx          # fonts (Inter, self-hosted), metadata, <html>/<body>
  globals.css         # Tailwind layers, glass utilities, keyframes
  page.tsx            # assembles all sections
components/
  Nav.tsx             # sticky glass nav, intensifies on scroll
  Hero.tsx            # headline + inline waitlist + signature demo (client)
  HeroCanvas.tsx      # WebGL shader-aurora (client-only, dynamic import)
  AuroraFallback.tsx  # pure-CSS aurora — the base look + graceful fallback
  VoiceDemo.tsx       # faux app window: animated waveform + word-by-word dictation
  WaitlistForm.tsx    # email capture w/ validation + loading/success/error states
  SocialProof.tsx     # "built by ex-Apple/Google" + greyscale logo row
  HowItWorks.tsx      # 01 / 02 / 03 steps
  Features.tsx        # 6-card feature grid (privacy highlighted)
  UseCases.tsx        # 3 personas
  Comparison.tsx      # typing vs Whisper Master table
  FinalCTA.tsx        # closing waitlist band
  Footer.tsx
  motion.tsx          # Reveal / Stagger / Item — scroll fade-up (reduced-motion aware)
  ui.tsx              # Section / SectionHeading / Eyebrow
  icons.tsx           # inline SVG icon set (no icon dependency)
  Wordmark.tsx        # logo wordmark
lib/
  config.ts           # product copy + FEATURE_3D_HERO kill switch
```

---

## Fonts / assets

- **Font:** Inter, loaded via `next/font/google` and **self-hosted at build time** — no
  runtime CDN call, no layout shift. Swap to Geist/Satoshi in `app/layout.tsx` if you prefer.
- **Logo:** a clean wordmark (`components/Wordmark.tsx`) with a small voice-bars glyph. No image asset to drop in.
- **No images** are required — all visuals are CSS/SVG/WebGL, so there's nothing to optimize or lazy-load beyond the canvas (already lazy + client-only).

---

## Connect the waitlist (currently stubbed)

The form is fully clickable with an optimistic success state. To send emails somewhere real,
edit one function — `submitEmail` in `components/WaitlistForm.tsx`:

```ts
// Formspree (simplest — no backend):
async function submitEmail(email: string) {
  const res = await fetch("https://formspree.io/f/<your-id>", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("failed");
}
```

For **Loops / Resend / Supabase**, create a `app/api/waitlist/route.ts` API route that holds
your secret key and `POST` to it from `submitEmail` (keeps keys off the client). The form's
loading / success / error states already handle the rest.

> State is kept in React only — no localStorage/sessionStorage — so it's safe in sandboxes.

---

## The 3D hero (kill switch)

The hero background is a WebGL **shader-gradient aurora** (simplex-noise flow in the accent color),
added as a progressive enhancement over the CSS aurora.

It **degrades silently** to the CSS aurora when any of these are true:

- WebGL is unavailable
- `prefers-reduced-motion` is set
- viewport is `< 768px` (phones fall back to CSS)

It also **pauses rendering** (`frameloop="never"`) when the hero scrolls out of view, and clamps
`dpr` to `[1, 2]`. Target: 60fps on an M1 Air, negligible battery.

**To kill it instantly during the pitch** — one line in `lib/config.ts`:

```ts
export const FEATURE_3D_HERO = false; // → CSS aurora everywhere, zero WebGL
```

---

## Deploy

```bash
npx vercel        # or push to a Git repo and import at vercel.com
```

Put the live URL on your last slide.

