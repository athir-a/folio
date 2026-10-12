# My Little Library

A cozy 3D digital library. You start with an empty blue bookshelf in a sunlit room.
Every PDF you add pops in with a game-style animation and lands on the shelf as a book.
Click a book to read it.

Everything is stored locally in your browser (IndexedDB). Nothing is uploaded anywhere.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Tech stack

| Concern                      | Tech                                   |
| ---------------------------- | -------------------------------------- |
| App UI and state             | React, TypeScript, Vite, Zustand       |
| 3D room, shelf, animations   | Three.js, React Three Fiber, drei      |
| Glow / vignette              | @react-three/postprocessing            |
| Reading PDFs                 | PDF.js (`pdfjs-dist`)                  |
| Local storage                | IndexedDB (via `idb`)                  |
| Hand gestures *(planned)*    | MediaPipe and OpenCV                   |

## Project structure

```
src/
├── main.tsx                 Entry point
├── App.tsx                  Puts the 3D scene, HUD and reader together
│
├── state/
│   └── libraryStore.ts      The single source of truth (Zustand). All actions live
│                            here: addFiles, openBook, closeBook, setLastPage, …
│
├── db/
│   └── libraryDb.ts         IndexedDB: book metadata, PDF files, cover images
│
├── pdf/
│   └── pdf.ts               PDF.js setup, title/author/cover extraction, spine colour
│
├── scene/                   Everything 3D
│   ├── LibraryScene.tsx     <Canvas>, camera, controls, post-processing
│   ├── shelf/
│   │   ├── layout.ts        Shelf dimensions and where each book goes
│   │   ├── Bookshelf.tsx    The blue bookcase (wobbles when a book lands)
│   │   ├── Books.tsx        Maps library books onto shelf slots
│   │   └── Book.tsx         One book: entrance animation, hover, fly-to-reader
│   ├── room/
│   │   ├── Room.tsx         Walls, wooden floor, window, curtains, rug, picture
│   │   ├── Plants.tsx       Fiddle-leaf fig and the trailing pothos
│   │   ├── Decor.tsx        Floor lamp, candle, trinkets
│   │   └── Lighting.tsx     Sunlight (with window-pane shadows) and dust motes
│   ├── effects/
│   │   └── LandingBursts.tsx  Confetti stars and shockwave when a book lands
│   └── utils/
│       ├── textures.ts      Canvas-painted textures (spines, wood, fabric, …)
│       └── easing.ts        Easing curves for the animations
│
├── ui/                      Regular HTML/CSS on top of the canvas
│   ├── hud/                 TopBar, AddBookButton, Toast, EmptyShelfHint, DropOverlay
│   └── reader/              Reader (page navigation) and PdfPage (renders one page)
│
├── lib/                     Small, framework-free helpers (colour, random, sound effects)
└── styles/
    └── global.css
docs/reference/              Mood-board images the room is based on
```

### How the pieces talk to each other

```
 UI (ui/)  ──┐
             ├──►  state/libraryStore  ──►  db/ (IndexedDB)
 3D (scene/) ┘            │
                          └──►  pdf/ (PDF.js)
```

The UI and the 3D scene never call each other directly. They read from and call
actions on `useLibrary`. Future input methods (hand gestures, voice, keyboard
shortcuts) can work the same way: a gesture module only needs to call
`openBook(id)`, `closeBook()` or `setLastPage(id, page)`.

## Adding hand gestures later

A suggested home is `src/gestures/`:

- `useHandTracking.ts`: webcam and MediaPipe Hand Landmarker, which emits landmarks
- `gestureRecognizer.ts`: turns landmarks into gestures (point, pinch, swipe)
- a `useGestureControls` hook that maps gestures to store actions, for example
  swipe left/right → `setLastPage`, pinch on a book → `openBook`

The reader already handles page changes through `setLastPage`, so page-turn
gestures can plug straight in.
