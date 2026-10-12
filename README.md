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
| Ambient occlusion, tone mapping, bloom | @react-three/postprocessing (N8AO) |
| Materials and models         | CC0 scans from [Poly Haven](https://polyhaven.com) |
| Reading PDFs                 | PDF.js (`pdfjs-dist`)                  |
| Local storage                | IndexedDB (via `idb`)                  |
| Hand gestures *(planned)*    | MediaPipe and OpenCV                   |

## Graphics quality

The **HQ / Fast** button in the top-right switches between the full look
(ambient occlusion, floor reflections, high-resolution soft shadows, high pixel
density) and a lighter mode for laptops and phones. The choice is remembered.

## Project structure

```
src/
├── main.tsx                 Entry point
├── App.tsx                  Puts the 3D scene, HUD and reader together
│
├── state/
│   ├── libraryStore.ts      The single source of truth (Zustand). All actions live
│   │                        here: addFiles, openBook, closeBook, setLastPage, …
│   └── settingsStore.ts     Viewer preferences: sound on/off, graphics quality
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
│   │   ├── Book.tsx         One book's behaviour: entrance animation, hover, fly-to-reader
│   │   └── BookModel.tsx    One book's looks: boards, page block, rounded foil-stamped spine
│   ├── room/
│   │   ├── Room.tsx         Plaster wall, window, skirting, oak floor, rug, curtains, picture
│   │   ├── Plants.tsx       Potted plant and the trailing pothos
│   │   ├── Decor.tsx        Floor lamp, candle, vase
│   │   └── Lighting.tsx     HDRI, sun and window-pane shadows, window light, sunbeam
│   ├── effects/
│   │   └── LandingBursts.tsx  Confetti stars and shockwave when a book lands
│   └── utils/
│       ├── assets.ts        Paths and loaders for the textures/models in public/assets
│       ├── textures.ts      Canvas-painted textures (book spines, curtain print, rug, …)
│       └── easing.ts        Easing curves for the animations
│
├── ui/                      Regular HTML/CSS on top of the canvas
│   ├── hud/                 TopBar, AddBookButton, Toast, EmptyShelfHint, DropOverlay
│   └── reader/              Reader (page navigation) and PdfPage (renders one page)
│
├── lib/                     Small, framework-free helpers (colour, random, sound effects)
└── styles/
    └── global.css
public/assets/               Scanned PBR textures, glTF models and the HDRI (CC0, see CREDITS.md)
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
