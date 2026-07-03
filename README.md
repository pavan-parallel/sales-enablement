# Parallel — Case Study Library

Our case studies as living, interactive walkthroughs, replacing static decks in sales calls.

**This is client-facing.** Both pages are shown on screen during pitches. No internal jargon, statuses, or ops UI belongs here.

## What's inside

| File | What it is |
|---|---|
| `index.html` | The library. Every project as a card, with spotlight search (`/` or `Cmd+K`), category filters, and a shortlist tray. |
| `healthify.html` | The Healthify × Parallel interactive walkthrough: four chapters, beat-by-beat storytelling, embedded Figma prototypes. |

Both files are fully self-contained (inline CSS and JS). The only external dependencies are Google Fonts and the Figma embeds.

## Run it locally

Any static server works:

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

Opening `index.html` directly from Finder also works.

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. Repo → Settings → Pages → Source: `main` branch, `/ (root)`.
3. The library will be live at `https://<org>.github.io/<repo>/`.

## Before presenting: Figma embeds

The walkthrough embeds two Figma files (the design handoff on the last chapter, and the "Popular around you" prototype). These load **only for viewers with file access** unless link sharing is on. Before a call or before sharing the link:

- Open each file in Figma → Share → **"Anyone with the link → can view."**

Without this, viewers see Figma's 404 page inside the embed.

## Presenting tips

- `→ / ←` move through beats. `1–4` jump to chapters. `C` opens Contents.
- Hovering the progress dots previews any beat.
- Click any insight or concept card to open its detail view; `← →` browse while it's open.

## Design language

Parallel brand: Libre Baskerville (headings), Figtree (UI), `#111` ink on warm white `#FCFBF8`, hairline borders, pill buttons. Green/amber/red are reserved for narrative judgements (growth, caution, decline); cluster/theme colours are categorical (blue/plum/teal). Keep it that way.
