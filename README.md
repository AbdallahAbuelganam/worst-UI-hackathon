# FryTube

A deep-fried video site where every interaction is a crime against usability.
Built for the Cursed UI/UX Showdown hackathon. It uses vanilla JS (ES modules) and SCSS, with no frameworks.

## Run it

The mic only works on `localhost` (secure context), so serve the folder. Don't open `index.html` as a file.

```bash
npx serve -l 5173 .
```

Then open http://localhost:5173 in Chrome or Edge. VS Code Live Server works too.

Add `?dev` for dev mode: http://localhost:5173/?dev

## SCSS

The compiled `css/main.css` is committed, so the site runs without a build. To recompile after editing `scss/`:

```bash
npx sass scss/main.scss css/main.css --no-source-map --watch
```

Design tokens (colours, Fredoka, radii, shadows, motion) live in `scss/_tokens.scss`, taken from the Claude Design export.

## Controls

| Key | Dino page | Dino + ad open | Hangman | Player |
|---|---|---|---|---|
| Space | Jump / restart | Command box | — | Command box |
| ↑ / ↓ | Jump / duck | Move cursor | — | Move cursor |
| ← → | — | Move cursor | — | Move cursor |
| Shift + arrows | Push the floating page | same | same | same |
| Enter | — | Click under the fake cursor | — | Click under the fake cursor |
| A–Z | — | — | Guess a letter | — |
| Esc | — | Close the box | — | Close the box / modal |

The real mouse is banned: moving it calls the mouse police.

Extra cruelty (all tunable in `js/config/tuning.js`):
- **Every on-screen button takes 2 seconds to respond.** The cursor shows a "loading…" countdown while you wait.
- **The page float gets worse over time.** Over 90s the bob grows from gentle to seasick. Random oil currents shove the page, and Shift+arrow pushes go slightly the wrong way.
- **Pop-ups keep growing.** Each one opens bigger than the last and swells while it's open. Ads start bigger every time and creep larger, but the X stays 14px.
- **A scream holds the volume for a full minute**, then it slides back to 0 over 20s.
- **The dislike flood is faster and bigger.** It starts 2s after the dislike, spawns 3 ads every 2s, and caps at 45.

## Commands (Space opens the box)

| Command | Effect |
|---|---|
| `please play` / `please pause` | Plays / pauses the video |
| `play` / `pause` | "Say please." |
| `skip ad` / `close ad` | "There's an X. Use it." |
| `sorry, I like the video` | Stops the ad flood and closes every ad |
| `repair screen` | Removes the crack scars |
| `forward` | Opens the 67 challenge |
| `scream again` | Retries the mic |
| `back` | Leaves the player → dino page |
| `help` | Lists the commands (shuffled) |
| anything else | An insult |

Evil autocorrect "fixes" about 1 in 5 commands, but never two in a row. For example, `please pause` becomes `please paws`, `back` becomes `bark`, and `sorry, I like the video` becomes `sorry not sorry` (+3 ads).

**Dev mode only** (`?dev`, press <kbd>`</kbd> to open the box on any screen): `dev win`, `dev player v1`, `dev ad`, `dev flood`. Dev mode also shows hitboxes, logs passwords to the console, and starts the float after 3s.

## Content

| What | Where |
|---|---|
| Videos, passwords, hints | `js/config/videos.js` |
| Ad reels (vertical 9:16 `.mp4`) | Drop them in `resources/ads videos/`. Every `.mp4` there is found automatically and picked at random. The main sponsor (`code flow duck.mp4`, set in `js/config/ads.js`) gets a blinking MAIN SPONSOR label and is always the first ad. |
| Thumbnails | `resources/thumbs/<id>.jpg` (optional: if missing, a frame is grabbed from the video) |
| Every tunable number | `js/config/tuning.js` |

If a reel fails to load, a static parody ad is shown in the same frame. If a video is missing, the player shows "Video missing" instead of crashing.

## The 3-minute demo loop

dino → hit an ad bird → chase the X 7 times → hit a thumbnail tree → guess `FALAFEL` → fullscreen player → scream for volume → get near the timeline falafel (boom) → chase the dislike button → ad flood → `sorry, I like the video`.
