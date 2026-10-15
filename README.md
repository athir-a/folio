# Folio

A cosy pixel-art library. You arrive in a lamp-lit hall at night: tall
bookcases, a big arched window full of stars, a sleeping cat on the rug. Press
**Go to my shelf** (or click the shelf marked *My Shelf*) and an iris wipe takes
you to your own bookcase. Every PDF you add pops up with a little "NEW BOOK!"
fanfare and lands on the shelf, its title stamped down the spine. Click a book to read it.

Everything is stored locally in your browser (IndexedDB). Nothing is uploaded anywhere.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

`/#shelf` opens straight at your shelf, and the browser's Back button returns to the hall.

## How it's drawn

The scenes are drawn on a small canvas (about 400×250 "art pixels") that is
scaled up by a whole number, so every pixel stays crisp and square. All the art
(walls, bookcases, the window and sky, lamps, the cat) is drawn in code from one
palette, so there are no image files and nothing heavy to download. It runs
happily on laptops and phones.

| Concern                | Tech                                         |
| ---------------------- | -------------------------------------------- |
| App UI and state       | React, TypeScript, Vite, Zustand             |
| Pixel scenes           | Canvas 2D, hand-written 5×7 and 3×5 fonts    |
| Reading PDFs           | PDF.js (`pdfjs-dist`)                        |
| Local storage          | IndexedDB (via `idb`)                        |
| Sound                  | Web Audio, chiptune-style, synthesised       |
| Hand gestures *(planned)* | MediaPipe and OpenCV                      |

## Project structure

```
src/
├── main.tsx                 Entry point
├── App.tsx                  Puts the pixel stage and the HTML overlays together
│
├── state/                   Zustand stores: the single source of truth
│   ├── libraryStore.ts      Books and their actions: addFiles, openBook, setLastPage, …
│   ├── viewStore.ts         Where you are: 'hall' or 'shelf' (synced with #shelf)
│   └── settingsStore.ts     Sound on/off
│
├── db/libraryDb.ts          IndexedDB: book metadata, PDF files, cover images
├── pdf/pdf.ts               PDF.js setup, title/author/cover extraction, spine colour
│
├── pixel/                   Everything drawn on the canvas
│   ├── PixelStage.tsx       The canvas: scaling, frame loop, input, iris wipe, tooltip
│   ├── palette.ts           The colour palette everything is drawn from
│   ├── font.ts              Bitmap fonts (5×7 and compact 3×5), incl. vertical spine text
│   ├── draw.ts              Pixel helpers: rects, dithering, glows, arches, seeded random
│   ├── props.ts             Bookcases, window & night sky, lamps, candles, rug, chair, cat…
│   ├── particles.ts         Stardust, dust puffs, drifting motes, floating "+1"
│   ├── books.ts             Book colours (snapped to the palette) and spine sizes
│   └── scenes/
│       ├── types.ts         The Scene interface
│       ├── hallScene.ts     The library hall (the dashboard)
│       └── shelfScene.ts    Your shelf: layout, spines, hover, the "NEW BOOK!" moment
│
├── ui/                      HTML overlays on top of the canvas
│   ├── hall/HallOverlay.tsx      Title sign, "Go to my shelf"
│   ├── shelf/                    "Back to the hall", "Add a book", empty-shelf hint
│   ├── reader/                   Reader (page navigation) and PdfPage (renders one page)
│   └── common/                   Sound toggle, toast, drag-and-drop
│
├── lib/                     Small framework-free helpers (colour, random, sound effects)
└── styles/global.css        Pixel panels, bevelled buttons, stepped animations
docs/reference/              Mood-board images
```

### How the pieces talk to each other

```
 UI (ui/)     ──┐                       ┌──► db/ (IndexedDB)
                ├──►  state/ stores  ───┤
 pixel scenes ──┘                       └──► pdf/ (PDF.js)
```

The UI and the scenes never call each other directly. They read from and call
actions on the stores. Future input methods (hand gestures, voice, keyboard
shortcuts) can work the same way: a gesture module only needs to call
`useView.getState().goTo('shelf')`, `openBook(id)`, `closeBook()` or `setLastPage(id, page)`.

## Adding hand gestures later

A suggested home is `src/gestures/`:

- `useHandTracking.ts`: webcam and MediaPipe Hand Landmarker, which emits landmarks
- `gestureRecognizer.ts`: turns landmarks into gestures (point, pinch, swipe)
- a `useGestureControls` hook that maps gestures to store actions, for example
  swipe left/right → `setLastPage`, pinch on a book → `openBook`

The reader takes its current page from the store, so page-turn gestures can plug straight in.
