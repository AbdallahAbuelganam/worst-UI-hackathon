# FryTube — PRD

> **Cursed UI/UX Showdown Hackathon** · Owner: Abdallah · v1.1 · 2026-11-07
> *FryTube* is a working name. A deep-fried video site where every interaction is a crime against usability.

**Changelog**
- **v1.1** — Ads are now **video reels** in a small pop-up with a tiny **X**. Clicking the X makes the ad **grow 6 times**; the **7th** click pauses everything, plays `skip add.ogg`, then closes the ad (same pattern as the dislike sound). This replaces the old `skip ad` command. Ads now also appear during the video (mid-roll).
- **v1.0** — First version.

---

## 0. How to use this document

This PRD has three parts:

| Part | For | What it covers |
|---|---|---|
| **A. Product spec** | Both | What the site does, flows, rules, every feature |
| **B. Design brief** | **Claude Design** | Screens, visual direction, states, motion |
| **C. Build spec** | **Claude Code** | Stack, files, state machine, commands, acceptance criteria |

**Order of work:** Claude Design first (mockups + tokens) → export → Claude Code builds using the design export + this PRD.

**Prompt for Claude Design:**
> Read this PRD and do the full design work without stopping for approval. Design every screen listed in Part B (sections B3–B4), following the visual direction in B1–B2. Produce one design per screen, including every listed state. Do not copy YouTube's or Google's branding. Also deliver the design tokens (colors, fonts, spacing, radii, shadows) so they can go straight into SCSS variables, and a short note on each animation in B4.3.

**Prompt for Claude Code:**
> Read `PRD.md` in this folder and the attached design export, then build the complete site end to end without stopping for approval. Use vanilla JS (ES modules) + SCSS only. Part A is the source of truth for behavior; Part C says how to build it. Work through the milestones in C10 in order, run the site on localhost, test it in the browser, and tick every acceptance criterion in C9 before finishing. Use the real assets in `resources/`; where an asset is missing, use the fallback described in this PRD instead of stopping. When done, write a short `README.md` with how to run it and the full command list.

---

# PART A — PRODUCT SPEC

## A1. Concept

A video website where you can't use the mouse, the homepage is a T-rex runner game, videos sit behind a hangman password, and the player fights you at every step. The whole page floats on a sea of falafel and fries, like it's being deep-fried.

**Goal for the hackathon:** make judges laugh *and* finish one full loop (dino → hangman → video → dislike → ad flood → sorry) in about 3 minutes.

## A2. Hard constraints

- **Stack:** HTML + vanilla JavaScript + SCSS. No frameworks, no Tailwind, no Bootstrap.
- **No real mouse.** The real cursor is hidden and real clicks do nothing. A **fake cursor** is moved with the **arrow keys** ("there IS a mouse, it's just on your keyboard").
- **Every click** = put the fake cursor on something and press **Enter**.
- **Pause/play** can never be clicked. It must be typed as a command in the **command box** (opened with **Space**).
- Must run from **localhost** (Live Server or `npx serve`) because the microphone needs a secure context.

## A3. Global controls

| Key | Dino page | Dino page **with an ad open** | Hangman | Player |
|---|---|---|---|---|
| **Space** | Jump (and restart after game over) | Open the command box | — | Open the command box |
| **↑** | Jump | Move the fake cursor up | — | Move the fake cursor up |
| **↓** | Duck | Move the fake cursor down | — | Move the fake cursor down |
| **← →** | — | Move the fake cursor | — | Move the fake cursor |
| **Shift + arrows** | Push the floating page | Push the floating page | Push the floating page | Push the floating page |
| **Enter** | — | Click under the fake cursor (the ad's X) | — | Click whatever is under the fake cursor |
| **A–Z** | — | — | Guess a letter | — (typing goes into open boxes) |
| **Esc** | — | Close the command box | — | Close the command box |

- The fake cursor is **hidden on the dino page and on hangman**, and visible on the player. **Exception:** while an ad is open on the dino page, the game is paused and the fake cursor appears so you can go after the X.
- While any text input is focused, keys type into it and the shortcuts above are paused (except Enter, which submits, and Esc, which closes).

## A4. User flow

```
                 ┌──────────── hit cactus ────────────┐
                 ▼                                    │
[Dino page] ──(Space)──▶ [Running] ──hit cactus──▶ [Game over] ──Space──▶ [Running]
                           │   │
                           │   └─hit bird ad──▶ [Reel ad pop-up] ──X clicked 7 times──▶ back to [Running]
                           │
                           └─hit thumbnail──▶ [Hangman] ──lose──▶ [Dino page]
                                                  │
                                                  └─win──▶ [Player, fullscreen]
                                                              │
                                                              └─ command "back" ──▶ [Dino page]
```

## A5. Features

### F1 — Dino page (homepage)
A Chrome-offline-style T-rex runner.
- **Cacti** = real obstacles. Touching one = **game over** (press Space to restart).
- **Thumbnail trees** = ground obstacles shaped like trees, whose canopy is a video thumbnail with the title under it. **Touching one opens that video's hangman.**
- **Ad birds** = flying obstacles at random heights, each carrying a tiny ad banner. **Touching one opens an ad pop-up** (F2). Duck to avoid them.
- The game speeds up over time, like the original.
- Score label: **"Videos dodged: N"** (thumbnails you jumped over instead of watching).
- Spawn mix (tunable): cactus 50% · thumbnail 30% · bird 20%. Never 2 thumbnails in a row.
- Idle state: "Press SPACE to start frying."

### F2 — Reel ad pop-up (one component, used everywhere)
Every ad on the site is the same component: a **vertical video reel** (9:16) in a **small pop-up box**, with a **tiny X** in the top-right corner.

**Where ads come from**
| Source | Trigger |
|---|---|
| Bird (F1) | The dino touches an ad bird. The game pauses. |
| Mid-roll (F4) | While the main video plays, one ad pops up every **60 seconds** (tunable; `0` turns it off). |
| Dislike flood (F12) | A new ad every 2s after a dislike, until `sorry, I like the video`. |

**Look & behavior**
- Starts **small**: about 30% of the screen height, 9:16, at a random position that keeps it fully on screen.
- Plays a random reel from `resources/ads/`, **looping, at full volume** (cursed contrast: the ad is loud while your video sits at 0 until you scream). In the flood, only the **newest** ad has sound; the rest are muted.
- A fake label at the top: **"Ad · Skip in 5"**, which counts **up** (5… 6… 7…) forever.
- The X is **tiny** (~14px) and **never gets bigger**, even when the box does.

**The X (the core joke)**
1. Move the fake cursor onto the X and press **Enter**.
2. **Clicks 1–6:** the ad does **not** close. It **grows one step** instead (pop animation), growing from its center, so the X jumps away from your cursor and you have to chase it again. Size steps (share of screen height): **30% → 40% → 50% → 60% → 70% → 80% → 92%**. The box is always kept fully on screen.
3. **Click 7** (works the same way as the dislike sound):
   1. The main video (if any) and the ad reel **pause**.
   2. `skip add.ogg` plays (6.8s).
   3. When the sound ends, the ad **closes** and the main video **resumes** (only if it was playing before). On the dino page, the game resumes with **2s of invincibility** (dino blinks).
- Each ad tracks its own click count.
- Clicking the ad body (not the X) does nothing except a toast: "Thanks for your interest. Nothing happens."

**Fallback:** if `resources/ads/` is empty or a reel fails to load, show one of the static parody ads from B4.2 in the same box. Everything else works the same.

### F3 — Hangman password gate
- Each video has a **password** and a **cursed hint** (set in the config file; see C5).
- The victim on the gallows is **the T-rex**. 6 wrong guesses: head → body → left arm → right arm → left leg → right leg/tail.
- Type letters A–Z. Repeated letters are ignored with a sarcastic toast ("You already tried that, genius").
- **Lose** → the T-rex is hanged → 2s "EXTINCT" animation → back to the dino page.
- **Win** → the keypress that completes the word triggers **fullscreen** and opens the player.

### F4 — Player (fullscreen)
- The **whole app** goes fullscreen (not just the `<video>`), so the command box, fake cursor, ads and effects stay visible.
- The video autoplays at **volume 0**.
- If the browser kicks you out of fullscreen (Esc), the **next keypress** silently puts you back in.
- **Mid-roll ads:** every 60s of playback, a reel ad (F2) pops up. The timer pauses while the video is paused.
- Controls on screen: timeline + dot, play/pause icon (a decoy), forward-67 button, mic button + volume meter, like, dislike, title, back hint.

### F5 — Fake cursor
- A custom cursor sprite, moved by arrow keys. It **accelerates** while a key is held (slow start, fast after ~0.5s) so precise aiming is annoying.
- It lives in screen coordinates and does **not** float with the page, so the floating page drifts out from under it.
- Moving onto an element = **hover**. Enter = **click**.
- **Decoy rule:** clicking the play/pause icon shows a toast: "Nice try. Press Space and TYPE it."

### F6 — Mouse police
- The real cursor is hidden (`cursor: none`), and real clicks and wheel events are blocked.
- When the real mouse/touchpad moves: a full-width banner **"🐭 MICE ARE NOT ALLOWED"** drops in, plus a screen shake. Throttled to once every 2s.

### F7 — Command box
- **Space** opens a pop-up with one input field. **Enter** submits. **Esc** closes.
- Matching is case-insensitive and ignores extra spaces and punctuation.
- Responds with a short message under the input (snarky tone).

| Command | Effect |
|---|---|
| `please play` / `please pause` | Plays / pauses the video |
| `play` / `pause` (no please) | Refused: "Say please." |
| `skip ad` / `close ad` | Refused: "There's an X. Use it." (ads close only through the X, F2) |
| `sorry, I like the video` | Stops the ad flood (F11) |
| `repair screen` | Removes the crack scar (F9) |
| `forward` | Opens the 67 challenge (same as the forward button) |
| `scream again` | Retries the mic if permission was denied |
| `back` | Leaves the player → dino page |
| `help` | Lists the commands (in a random order every time) |
| anything else | Random insult: "Command not found. Neither is your talent." |

### F8 — Evil autocorrect
- About **1 in 5** submitted commands get "corrected" before they run. It **never fires twice in a row**, so the demo stays playable.
- It shows a strike-through animation: ~~please pause~~ → **please paws**.

| You type | Becomes | Result |
|---|---|---|
| please play | please pray | 🙏 appears, nothing happens |
| please pause | please paws | 🐾 paw prints walk across the screen |
| repair screen | repaint screen | Screen flashes pink for 1s, scar stays |
| sorry, I like the video | sorry not sorry | **3 extra ads** spawn |
| back | bark | 🐕 "Woof." |
| forward | foreword | A fake book foreword about falafel appears for 3s |

### F9 — Running timeline dot + crash
- When the fake cursor gets within **~60px** of the timeline dot, the dot **panics**: it accelerates (ease-in) toward the **nearest end** (start or end, whichever is closer) and the video time jumps with it.
- On arrival:
  1. Explosion sound (synthesized with Web Audio, so no file is needed)
  2. White flash → screen shake (~0.6s) → particles/debris
  3. A **cracked-glass scar** overlay appears and **stays** until `repair screen` is typed.
- **At the end:** the video ends. Message: "You killed it. Type `back` or `please play` to restart."
- **At the start:** the video restarts from 0 and keeps playing.
- Multiple crashes stack more cracks (max 3 layers).

### F10 — 67 forward challenge
- Opened by clicking the **forward** button (Enter) or the `forward` command. The video keeps playing.
- Modal with a **15s countdown**, an input field and a counter **"67 × N / 100"**.
- Counts every non-overlapping `67` typed. **Paste is blocked.**
- Each counted 67 flashes a huge **"SIX SEVEN 🤷"** on screen (quick, about 300ms).
- When the timer ends: **jump forward = (N / 100) × 10 seconds**, capped at 10s. Example: 43 → +4.3s.
- Result message: "You typed 67 forty-three times for 4.3 seconds. Worth it?"

### F11 — Scream volume
- Volume starts at **0**. The volume meter shows 0.
- Clicking the **mic** button asks for microphone permission, then opens a **5-second "SCREAM NOW"** window with a live loudness meter.
- **Max volume = the loudest peak** you hit (mapped 0–100%).
- **Decay:** after the window closes, volume slides from the peak back to 0 over **20 seconds**. You have to scream again.
- Permission denied → "No mic? No sound. Enjoy the silence." `scream again` retries.

### F12 — Escaping dislike button
- When the fake cursor hovers the dislike button, it **jumps to a random spot** in the control bar. It does this **3 times**.
- On the 4th hover it gives up and stays (it shakes a little).
- Enter on it →
  1. The video pauses
  2. `dislike.ogg` plays (8.5s)
  3. The video resumes
  4. **10 seconds later the ad flood starts:** a new reel ad pop-up (F2) every **2 seconds** at a random position, endlessly.
- Each flood ad can still be closed with its own X (7 clicks), but new ones arrive faster than you can close them. The real way out is typing **`sorry, I like the video`**, which closes all ads at once (no sound).
- Only the **newest** flood ad plays sound; older ones are muted.
- Safety cap: at most **15** ads on screen (remove the oldest beyond that). Only the **3 newest** reels play; older ones freeze on their current frame, to keep it smooth.
- The dodge counter resets after a successful dislike, so it can happen again.

### F13 — Like button
- Normal behavior. Enter → "❤️ +1. Nobody cares." toast. (Contrast makes the dislike funnier.)

### F14 — Floating page
- **25 seconds** after the site first loads (one global timer, it doesn't reset per screen), the whole page starts floating on the falafel/fries background.
- **Idle bob:** gentle up/down and tilt (≈ ±12px, ±1.5°, 4s loop).
- **Shift + arrows** push the page: each press adds velocity, water friction slows it down, and it bounces softly off the screen edges.
- At least **20%** of the page must stay on screen.
- The background image does **not** move. Only the page floats on top of it.

## A6. Assets

| Asset | Status | Path |
|---|---|---|
| Background (falafel & fries) | ✅ Have | `resources/background.jpg` (843×475) |
| Dislike sound | ✅ Have | `resources/dislike.ogg` (8.5s) |
| Skip-ad sound | ✅ Have | `resources/skip add.ogg` (6.8s) — plays on the 7th X click |
| Ad reels (vertical 9:16 `.mp4`, short) | ❌ Abdallah to add | `resources/ads/` — the site loads whatever `.mp4` files are listed in `js/config/ads.js` |
| Videos (3–5 short `.mp4`) | ❌ Abdallah to add | `resources/videos/` |
| Thumbnails (one per video) | ❌ Abdallah to add | `resources/thumbs/` |
| Passwords + hints | ❌ Abdallah to fill | `js/config/videos.js` |
| Explosion sound | Generated in code (Web Audio) | — |
| Fallback static ads | Designed by Claude Design / made in CSS | Used only when a reel is missing |

*The background is low-res (843×475). Tile it at native size (`background-repeat: repeat`) instead of stretching, so it stays sharp and looks like an endless fryer.*

---

# PART B — DESIGN BRIEF (Claude Design)

## B1. Visual direction: "Deep-fried retro"
- **Two worlds that clash on purpose:**
  1. **Dino world:** monochrome pixel art like the offline dinosaur (off-white bg `#f7f7f7`, ink `#535353`). The thumbnails and ads are the only color in it.
  2. **Player world:** a glossy, over-confident video player. Dark glass panels, neon accents, chunky controls.
- **Everything floats** on a tiled falafel & fries background. The page itself is a "card" with a thick border and a drop shadow, so it reads as an object floating in oil.
- **Tone of all copy:** sarcastic, short, a little rude, never offensive. English only.
- **Do not** use YouTube or Google logos, names or exact layouts. Generic "video site" parody only.

## B2. Design tokens (proposed — refine and deliver)
| Token | Value | Use |
|---|---|---|
| `--oil` | `#C8861E` | Accent / falafel brown-gold |
| `--fry` | `#F5C542` | Highlights, fries yellow |
| `--parsley` | `#3FA34D` | Success |
| `--ketchup` | `#E0332F` | Danger, dislike, ads |
| `--ink` | `#535353` | Dino-world ink |
| `--paper` | `#F7F7F7` | Dino-world background |
| `--glass` | `rgba(15,15,20,.78)` | Player panels |
| Display font | Pixel font (e.g. "Press Start 2P") | Dino world, scores, big flashes |
| UI font | Chunky rounded sans | Player UI, command box |
| Mono font | Any monospace | Command input, 67 input |

## B3. Screen inventory

| # | Screen | States to design |
|---|---|---|
| S1 | Dino page | Idle ("Press SPACE to start frying") · Running · Game over |
| S2 | Obstacles sprite sheet | Cactus (3 sizes) · Thumbnail tree (canopy = 16:9 thumb + title) · Ad bird (2 wing frames + mini banner) · T-rex (run 2 frames, duck 2 frames, jump, dead, blinking) |
| S3 | Reel ad pop-up | Size step 1 (small, 30% height) · Steps 2–6 · Step 7 (92%, nearly full screen) · "Skip in" label counting up · X hovered by the fake cursor · Closing (sound playing, reel paused, "Skipping…" overlay) · Fallback static ad inside the same frame |
| S4 | Hangman | Empty · Mid-game (some letters, some wrong) · Lose ("EXTINCT") · Win (flash before fullscreen) |
| S5 | Player (fullscreen) | Playing · Paused · Ended ("You killed it") |
| S6 | Command box | Empty · Typed · Success response · Refused ("Say please.") · Autocorrect strike-through |
| S7 | 67 challenge modal | Start · Mid-typing with "SIX SEVEN 🤷" flash · Result |
| S8 | Scream modal | Waiting for permission · SCREAMING (live meter + peak marker) · Denied |
| S9 | Crash effect | 4 keyframes: flash → shake → debris → scar · Crack scar overlay (3 stacking variants) |
| S10 | Dislike button | Normal · Dodging (motion trail) · Gave up (shaking) |
| S11 | Ad flood | Player with 10+ overlapping reel ads of different sizes |
| S12 | Mouse police banner | Single state |
| S13 | Fake cursor | Default · Hovering something clickable · "Click" press |
| S14 | Toasts | Generic toast style (like +1, decoy, "already tried that") |

## B4. Screen notes

### B4.1 Player layout (S5)
- The video fills the screen. The bottom control bar is a glass panel:
  `[▶︎/⏸ decoy] [timeline ───●──────] [time] [⏩ 67] [🎤 + meter] [👍] [👎] `
- The play/pause icon should look **very clickable** (it's a trap).
- The volume meter is vertical, next to the mic, with a "peak" line that slowly drops (decay).
- A tiny hint in the corner: "Space = commands · Arrows = mouse · Shift+Arrows = boat".

### B4.2 Reel ad frame + fallback ads (S3, S11)
**The frame** (the important part): a vertical 9:16 box that looks like a cheap phone-reel ad.
- Thin blinking border, a small "Ad" pill and the "Skip in 5" label at the top-left.
- The **X** at the top-right is **tiny** (~14px), low-contrast, and slightly inset so it's annoying to hit. It must keep the same size at every growth step.
- Each growth step should look a bit more desperate (e.g. the border gets thicker and the colors get louder).

**Fallback static ads** — make 6–8 variants that fit in the same 9:16 frame. Parody ads with no real brands. Ideas:
- "🧆 Hot single falafels in your area"
- "Download more RAM — 100% legit"
- "Doctors HATE this one weird T-rex"
- "Your PC has 67 viruses. Type 67 to fix."
- "Free fries* (*no)"
- "Learn hangman in 3 days or your money back"
Bright clashing colors, bad gradients, blinking borders: classic 2005 pop-up energy.

### B4.3 Motion specs
| Motion | Spec |
|---|---|
| Page float idle | translateY ±12px + rotate ±1.5°, 4s ease-in-out loop |
| Dot panic | ease-in acceleration, ~600ms to reach the end |
| Crash | flash 80ms → shake 600ms (decaying) → debris 1s → scar fades in 200ms |
| Dislike dodge | 150ms jump with motion trail |
| SIX SEVEN flash | scale 0.5→1.4 + fade out, 300ms |
| Mouse police | banner drops from top, 300ms, stays 1.5s |
| Ad spawn | pop in with overshoot, 200ms |
| Ad grow (X click 1–6) | scale up from center to the next size step with overshoot, 250ms; tiny shake |
| Ad close (X click 7) | reel freezes, "Skipping…" overlay while the sound plays, then shrink + fade out, 200ms |

---

# PART C — BUILD SPEC (Claude Code)

## C1. Stack & running
- **HTML + vanilla JS (ES modules) + SCSS.** No frameworks or CSS libraries.
- SCSS compiled with the `sass` npm package (`npx sass scss/main.scss css/main.css --watch`) or the VS Code "Live Sass Compiler" extension. The compiled `css/main.css` is committed so the site runs without a build.
- Run with **VS Code Live Server** or `npx serve .` → `http://localhost`. The mic does not work from `file://`.
- Target: latest Chrome/Edge on desktop.

## C2. File structure
```
worst UI hackathon/
├── index.html
├── PRD.md
├── scss/
│   ├── main.scss            # imports only
│   ├── _tokens.scss         # from the Claude Design export
│   ├── _base.scss           # reset, background tile, cursor:none
│   ├── _float.scss
│   ├── _dino.scss
│   ├── _hangman.scss
│   ├── _player.scss
│   ├── _command-box.scss
│   ├── _modals.scss         # 67 challenge, scream
│   ├── _ads.scss
│   ├── _effects.scss        # crash, scar, flashes, toasts, mouse police
│   └── _cursor.scss
├── css/main.css             # compiled
├── js/
│   ├── main.js              # boot, screen router
│   ├── state.js             # app state machine + event bus
│   ├── config/videos.js     # videos, passwords, hints (Abdallah fills)
│   ├── config/ads.js        # list of ad reel files (Abdallah fills)
│   ├── config/tuning.js     # all numbers in one place (C7)
│   ├── input/keyboard.js    # central key handler + per-screen mapping
│   ├── input/fake-cursor.js
│   ├── input/mouse-police.js
│   ├── float.js
│   ├── dino/game.js         # canvas runner
│   ├── dino/sprites.js
│   ├── hangman.js
│   ├── player/player.js
│   ├── player/timeline.js   # dot panic + crash trigger
│   ├── player/skip67.js
│   ├── player/scream.js     # mic + decay
│   ├── player/dislike.js
│   ├── ads.js               # reel ad component (grow/X logic), bird ads, mid-roll, flood
│   ├── commands.js          # parser + command table
│   ├── autocorrect.js
│   ├── effects/crash.js     # flash, shake, debris, scar
│   ├── effects/sfx.js       # Web Audio explosion + audio file playback
│   └── ui/toast.js
└── resources/
    ├── background.jpg
    ├── dislike.ogg
    ├── skip add.ogg
    ├── videos/
    ├── thumbs/
    └── ads/                 # vertical reels for ads
```

## C3. Architecture
- **Single page.** Screens are `<section>`s toggled by the router. All screens live inside one `#world` wrapper; that wrapper is what floats (F14).
- **Overlays outside `#world`** so they don't float: fake cursor, mouse police banner. (Ads, command box and modals live **inside** `#world` and float with the page.)
- **One state machine** in `state.js`:
  `DINO_IDLE → DINO_RUNNING ⇄ AD_OPEN → GAME_OVER → DINO_RUNNING`
  `DINO_RUNNING → HANGMAN → (lose) DINO_IDLE | (win) PLAYER`
  `PLAYER → (back) DINO_IDLE`
  The player has sub-flags: `commandBoxOpen`, `challenge67Open`, `screamOpen`, `adFloodActive`, `scarLevel`, `dislikeDodges`, `openAds[]` (each ad: `{id, el, video, clicks, sizeStep, closing}`).
- **`AD_OPEN` on the dino page** pauses the game loop and shows the fake cursor. It returns to `DINO_RUNNING` when the ad finishes closing.
- **One keyboard handler** (`keyboard.js`) that routes keys by current state. No other module adds `keydown` listeners directly; they subscribe through the event bus. This prevents Space/arrow conflicts.
- **Hover/click from the fake cursor:** every frame, `document.elementFromPoint(cursorX, cursorY)`. Elements with `data-hoverable` get custom `fakeenter` / `fakeleave` events; Enter fires `fakeclick` on the element under the cursor. **Real** `click`, `mousedown`, `wheel`, `contextmenu` are `preventDefault`-ed globally.
- **Fullscreen:** `document.documentElement.requestFullscreen()` inside the keydown handler that completes the hangman word (it needs the user gesture). On `fullscreenchange` → if exited while in `PLAYER`, set a flag; on the next keydown, re-request.
- **Audio unlock:** create the `AudioContext` on the first keydown (Space to start the dino game).

## C4. Key mapping implementation
- `Space`: DINO → jump/restart · AD_OPEN or PLAYER → open command box.
- `ArrowUp`: DINO → jump · AD_OPEN / PLAYER → cursor up.
- `ArrowDown`: DINO → duck (while held) · AD_OPEN / PLAYER → cursor down.
- `ArrowLeft/Right`: AD_OPEN / PLAYER → cursor.
- `Shift + Arrow*`: any state → float impulse (checked **before** the plain-arrow cases).
- `Enter`: AD_OPEN / PLAYER (no input focused) → `fakeclick`. Input focused → submit.
- `Esc`: close the command box / modals.
- While an input is focused: ignore all shortcuts except Enter and Esc.

## C5. Config: `js/config/videos.js`
```js
export const VIDEOS = [
  {
    id: 'v1',
    title: 'Placeholder video 1',
    src: 'resources/videos/v1.mp4',
    thumb: 'resources/thumbs/v1.jpg',
    password: 'FALAFEL',
    hint: 'Round, fried, and judging you',
  },
  // ... up to 5
];
```
- Passwords: letters A–Z only, uppercase, 4–10 letters.

**`js/config/ads.js`**
```js
export const AD_REELS = [
  'resources/ads/reel1.mp4',
  'resources/ads/reel2.mp4',
  // ... add every reel file here
];
```
- Pick a random reel per ad; avoid the same reel twice in a row.
- Use `encodeURI()` on every path (file names may contain spaces, like `skip add.ogg`).
- **If a video or thumb file is missing**, draw a generated placeholder thumbnail (colored rect + title) on the canvas and show "video missing" in the player instead of crashing.

## C6. Feature implementation notes
| Feature | Notes |
|---|---|
| Dino (F1) | `<canvas>`, `requestAnimationFrame`, AABB collision with slightly shrunk hitboxes. Preload thumbnail images and draw them into the tree canopy. Speed starts at 6 px/frame, +0.001/frame, cap 13. |
| Hangman (F3) | Draw the T-rex on the gallows with SVG parts toggled by the wrong-guess count. Letters via `keydown` on A–Z. |
| Timeline (F9) | Distance from cursor to dot center < 60px → animate the dot with an ease-in tween to `0` or `duration`, update `video.currentTime` at the end, then `crash.trigger()`. Ignore hovers during the animation. |
| Crash (F9) | Flash div, CSS shake keyframes on `#world`, ~30 debris divs with random velocity, then append a crack-scar SVG layer (max 3). Explosion: Web Audio noise burst + low sine thump (~0.8s). |
| 67 (F10) | Count matches of `/67/g` in the input value. Block `paste`, `drop`. A 15s countdown with `setInterval`. Jump `= Math.min(10, count/100*10)`. |
| Scream (F11) | `getUserMedia({audio:true})` → `AnalyserNode` → RMS per frame for 5s, track the peak, normalize (calibrate so a loud scream ≈ 1.0; clamp). Then decay `video.volume` linearly to 0 over 20s. Stop the mic tracks after the window. |
| Dislike (F12) | On `fakeenter`, if `dodges < 3` → move the button to a random free slot in the control bar, `dodges++`. On `fakeclick` with `dodges >= 3` → pause, play `dislike.ogg`, on `ended` resume, `setTimeout(startFlood, 10000)`. |
| Reel ad (F2) | `createAd({source})` builds the frame + `<video autoplay loop playsinline>` and pushes it to `openAds`. Size = `TUNING.adSizeStepsVh[sizeStep]` vh tall, width = height × 9/16; `transform-origin: center`; after each resize, clamp the position so the box stays fully on screen. The X has `data-hoverable` and a `fakeclick` handler: `clicks++`; if `clicks < 7` → `sizeStep++` + grow animation; if `clicks === 7` → `closing = true`, remember whether the main video was playing, pause main video + reel, play `skip add.ogg`, on `ended` remove the ad and resume what was playing. Ignore X clicks while `closing`. Sound should be audible because the user has already pressed keys (sticky user activation); if `play()` rejects, retry muted. |
| Bird ad (F2) | Dino collision with a bird → pause the loop → `createAd({source:'bird'})` → state `AD_OPEN`. When that ad closes → resume with 2s invincibility. |
| Mid-roll (F4) | Count main-video playback time (use `timeupdate` deltas, so pauses don't count). Every `TUNING.midrollEveryMs` → `createAd({source:'midroll'})`. Don't spawn a mid-roll while one is already open. |
| Ad flood (F12) | `setInterval(() => createAd({source:'flood'}), 2000)`. Cap 15 (remove oldest). Only the newest ad is unmuted; only the 3 newest play. `stopFlood()` clears the interval and removes **all** open ads without playing the sound. |
| Commands (F7) | Normalize: lowercase, strip punctuation, collapse spaces. Then the autocorrect roll, then table lookup. Context-aware: `sorry, I like the video` only does something during a flood, otherwise "Apology accepted. Nothing changed." |
| Autocorrect (F8) | 20% chance, `lastWasCorrected` flag blocks two in a row. Only corrects commands listed in the F8 table. |
| Float (F14) | Starts 25s after load. Idle bob via CSS animation on an inner wrapper; push via JS velocity on the outer wrapper (`transform: translate()`), friction 0.96/frame, impulse 4px/frame per keydown, bounce factor 0.5, keep ≥20% on screen. |
| Fake cursor (F5) | Speed starts at 4px/frame, ramps to 18px/frame after 500ms held, supports diagonals. Clamp to the viewport. |
| Mouse police (F6) | `mousemove` → show the banner + shake if not shown in the last 2s. |

## C7. Tuning file: `js/config/tuning.js`
All the numbers in one place so they can be tweaked quickly during the demo:
```js
export const TUNING = {
  floatStartMs: 25000,
  dotPanicRadiusPx: 60,
  skip67MaxSeconds: 10,
  skip67Target: 100,
  skip67DurationMs: 15000,
  screamWindowMs: 5000,
  volumeDecayMs: 20000,
  dislikeDodges: 3,
  adFloodDelayMs: 10000,
  adFloodIntervalMs: 2000,
  adFloodCap: 15,
  adFloodPlayingCount: 3,
  adSizeStepsVh: [30, 40, 50, 60, 70, 80, 92],
  adCloseClicks: 7,
  adXSizePx: 14,
  midrollEveryMs: 60000,   // 0 = off
  autocorrectChance: 0.2,
  hangmanLives: 6,
  spawnWeights: { cactus: 0.5, thumb: 0.3, bird: 0.2 },
};
```

## C8. Dev mode
- `?dev` in the URL:
  - Shows hitboxes on the dino canvas
  - Logs passwords to the console
  - Adds the commands `dev win` (skip hangman), `dev player v1` (jump straight to a video) and `dev ad` (spawn a reel ad now)
  - Shortens `floatStartMs` to 3s
- Must be off by default.

## C9. Acceptance criteria

**Global**
- [ ] Real mouse movement shows the mouse police banner; real clicks do nothing anywhere.
- [ ] No two features fight over the same key (see C4) in any state.
- [ ] After 25s the page floats; Shift+arrows push it; it never leaves less than 20% on screen.
- [ ] The background is tiled and does not move.

**Dino / ads / hangman**
- [ ] Cactus = game over; Space restarts.
- [ ] Thumbnail = hangman for **that** video.
- [ ] Bird = reel ad pop-up; game paused; fake cursor appears and arrows move it.

**Reel ads (all sources)**
- [ ] Ad is a small 9:16 box playing a random reel from `resources/ads/` (or a fallback static ad), with a tiny X and a "Skip in" label counting up.
- [ ] X clicks 1–6 grow the ad one size step each (30→92% height); the X stays tiny; the box stays fully on screen.
- [ ] X click 7: main video + reel pause → `skip add.ogg` plays → ad closes → main video resumes only if it was playing (dino: game resumes with invincibility).
- [ ] Each ad keeps its own click count; clicks during closing are ignored.
- [ ] Mid-roll ad appears every 60s of actual playback; never two mid-rolls at once.
- [ ] `skip ad` / `close ad` commands are refused with "There's an X. Use it."
- [ ] Hangman: 6 wrong guesses = lose → dino page. Completing the word → fullscreen + player.

**Player**
- [ ] Video starts at volume 0, fullscreen, and fullscreen comes back after Esc on the next keypress.
- [ ] Arrows move the fake cursor; Enter clicks what's under it.
- [ ] Clicking the play/pause icon shows the decoy toast; only `please play` / `please pause` work.
- [ ] Cursor near the dot → the dot runs to the nearest end → explosion sound + flash + shake + scar; the scar stays until `repair screen`.
- [ ] 67 challenge: 15s timer, paste blocked, live counter, SIX SEVEN flash, jump = count/100 × 10s.
- [ ] Mic: 5s scream → volume = peak → decays to 0 over 20s; denied permission handled.
- [ ] Dislike dodges 3 times, is clickable on the 4th; pause → `dislike.ogg` → resume → reel ads every 2s from +10s until `sorry, I like the video`, which closes all of them; max 15 on screen, only the newest has sound.
- [ ] Autocorrect fires ~20% of the time, never twice in a row, with the visible strike-through.
- [ ] `help` lists all commands; unknown commands get an insult.
- [ ] Missing video/thumb files don't crash the site.

## C10. Build milestones
1. **Skeleton:** `index.html`, SCSS pipeline, tokens, router, state machine, keyboard handler, tiled background.
2. **Input layer:** fake cursor, fakeenter/fakeclick, mouse police, command box + parser + `help`.
3. **Dino game:** canvas runner, cacti, thumbnail trees, birds, game over.
4. **Reel ads:** the ad component (reel, tiny X, 6 growth steps, 7th-click sound + close), bird ads on the dino page, fallback static ads.
5. **Hangman:** T-rex gallows, lose/win, fullscreen handoff.
6. **Player core:** video, decoy play/pause, `please play/pause`, `back`, fullscreen re-entry, mid-roll ads.
7. **Cursed controls:** timeline dot + crash + scar, 67 challenge, scream volume + decay.
8. **Dislike + ad flood + sorry.**
9. **Autocorrect, float, polish:** all toasts, sounds, motion from B4.3.
10. **QA pass:** go through every C9 checkbox; then a full demo run in about 3 minutes.

## C11. Out of scope
- Mobile/touch support
- Real backend, accounts, uploads
- Real YouTube embeds
- Accessibility (deliberately — this is a worst-UI hackathon; mention it to the judges as a joke)

## C12. Open items
- [ ] Abdallah adds 3–5 short `.mp4` videos + thumbnails to `resources/`.
- [ ] Abdallah fills in titles, passwords and hints in `js/config/videos.js`.
- [ ] Abdallah adds the ad reels to `resources/ads/` and lists them in `js/config/ads.js`.
- [ ] Confirm the working name "FryTube" or choose another.
