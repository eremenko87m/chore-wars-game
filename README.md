# Chore Wars — Summer House Mission

A self-contained browser game for a Grade 4 English lesson (A1+) on **chores + Present Simple**.

Recurring characters are consistent throughout the game:
- Max — blue / surfer
- Mia — yellow / skater
- Leo — green / gamer
- Zoe — purple / music fan

## What is included

- 4-player classroom mode with editable student names
- individual scores and rotating turns
- Mission 1: clickable chore hunt
- Mission 2: choose a hero + speaking prompts
- Mission 3: detective speaking challenge
- Mission 4: Present Simple Chore Battle
- Mission 5: random WHO + CHORE + WHEN generator
- Mission 6: Two True, One False speaking round
- Final Boss with 4 grammar locks + 30-second speaking timer
- sound effects generated in the browser (no external audio files)
- fullscreen presentation mode
- responsive layout
- no frameworks and no server required

## Run locally

Open `index.html` in a browser. For the most reliable local behavior, you can also serve the folder with any simple static server.

Example with Python:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload the contents of this folder so `index.html` is at the repository root.
3. Enable GitHub Pages for the repository and publish the root of your main branch.
4. GitHub will provide a public Pages URL for the game.

No build step is needed.

## Files

- `index.html` — page structure
- `styles.css` — game design and responsive layout
- `game.js` — all interaction, scoring, sounds, missions and Final Boss logic
- `assets/` — lesson artwork

## Teacher use

The game is designed to be shared on screen during an online lesson. Students answer orally; the teacher clicks the game controls and awards points. This keeps the language level at A1+ while making the lesson feel like a game rather than a worksheet.
