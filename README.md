# Folio

A candlelit library among the stars. You arrive in a great hall at night:
two storeys of walnut bookcases, a gothic window onto a moonlit valley,
armchairs, lamps and lanterns. Press **Go to my shelf** and you walk down the
hall to your own bookcase. Every PDF you add is bound into a book and shelved
there with a little stardust. Click a book to read it.

Everything is stored locally in your browser (IndexedDB). Nothing is uploaded anywhere.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

`/#shelf` opens straight at your shelf, and the browser's Back button walks you back to the hall.

## Tech stack

| Concern                                | Tech                                               |
| -------------------------------------- | -------------------------------------------------- |
| App UI and state                       | React, TypeScript, Vite, Zustand                   |
| 3D hall, books, animations             | Three.js, React Three Fiber, drei                  |
| Ambient occlusion, bloom, tone mapping | @react-three/postprocessing (N8AO)                 |
| Materials                              | CC0 scans from [Poly Haven](https://polyhaven.com) |
| Reading PDFs                           | PDF.js (`pdfjs-dist`)                              |
| Local storage                          | IndexedDB (via `idb`)                              |
| Sound                                  | Web Audio, synthesised (no audio files)            |
| Hand gestures *(planned)*              | MediaPipe and OpenCV                               |

## Graphics quality

The **HQ / Fast** button switches between the full look (ambient occlusion,
floor reflections, high-resolution soft shadows, high pixel density) and a
lighter mode for laptops and phones. The choice is remembered.

## Project structure

```
src/
├── main.tsx                 Entry point
├── App.tsx                  Puts the 3D scene and the overlays together
│
├── state/                   Zustand stores: the single source of truth
│   ├── libraryStore.ts      Books and their actions: addFiles, openBook, setLastPage, …
│   ├── viewStore.ts         Where you're standing: 'hall' or 'shelf' (synced with #shelf)
│   └── settingsStore.ts     Sound on/off, graphics quality
│
├── db/libraryDb.ts          IndexedDB: book metadata, PDF files, cover images
├── pdf/pdf.ts               PDF.js setup, title/author/cover extraction, spine colour
│
├── scene/                   Everything 3D
│   ├── LibraryScene.tsx     <Canvas>, haze, post-processing
│   ├── camera/
│   │   └── CameraRig.tsx    Walks between the hall and the shelf; idle mouse drift
│   ├── hall/                The library itself
│   │   ├── layout.ts        Dimensions: nave, bays, balcony, window, which bay is yours
│   │   ├── Hall.tsx         Assembles everything below
│   │   ├── materials.ts     Shared walnut, brass, iron, velvet, plaster
│   │   ├── Architecture.tsx Floor, walls, ribbed vault, pilasters, balconies, railings
│   │   ├── GothicWindow.tsx Iron tracery, glass, sill, banner
│   │   ├── NightSky.tsx     Painted valley and city, twinkling stars and lights
│   │   ├── Bookcases.tsx    ~11,000 antique books in one instanced mesh
│   │   ├── Furniture.tsx    Sofa, armchairs, tables, lamps, lanterns, rugs
│   │   └── HallLighting.tsx Moonlight, window glow, sconces, night reflections, dust
│   ├── shelf/               Your own bookcase
│   │   ├── layout.ts        Shelf dimensions and where each book goes
│   │   ├── Bookshelf.tsx    The walnut bookcase (wobbles when a book lands)
│   │   ├── UserBay.tsx      Brass plaque, picture light, spotlight, golden motes
│   │   ├── Books.tsx        Maps library books onto shelf slots
│   │   ├── Book.tsx         One book's behaviour: arrival animation, hover, fly-to-reader
│   │   └── BookModel.tsx    One book's looks: boards, page block, foil-stamped spine
│   ├── effects/
│   │   └── LandingBursts.tsx  Stardust and a golden ring when a book lands
│   └── utils/
│       ├── assets.ts        Loaders for the textures in public/assets
│       ├── geometry.ts      Merging pieces into one mesh, world-scale UVs, pointed arches
│       ├── textures.ts      Canvas-painted textures (spines, sky, rug, banner, plaque)
│       └── easing.ts        Easing curves for the animations
│
├── ui/                      HTML overlays on top of the canvas
│   ├── hall/HallOverlay.tsx      Title, verse, "Go to my shelf"
│   ├── shelf/                    "Back to the hall", "Add a book", empty-shelf hint
│   ├── reader/                   Reader (page navigation) and PdfPage (renders one page)
│   └── common/                   Settings buttons, toast, drag-and-drop, loading screen
│
├── lib/                     Small framework-free helpers (colour, random, sound effects)
└── styles/global.css        Midnight / walnut / antique-gold theme
public/assets/               Scanned PBR textures (CC0, see CREDITS.md)
docs/reference/              Mood-board images the hall and shelf are based on
```

### How the pieces talk to each other

```
 UI (ui/)  ──┐                       ┌──► db/ (IndexedDB)
             ├──►  state/ stores  ───┤
 3D (scene/) ┘                       └──► pdf/ (PDF.js)
```

The UI and the 3D scene never call each other directly. They read from and
call actions on the stores. Future input methods (hand gestures, voice,
keyboard shortcuts) can work the same way: a gesture module only needs to call
`useView.goTo('shelf')`, `openBook(id)`, `closeBook()` or `setLastPage(id, page)`.

## Adding hand gestures later

A suggested home is `src/gestures/`:

- `useHandTracking.ts`: webcam and MediaPipe Hand Landmarker, which emits landmarks
- `gestureRecognizer.ts`: turns landmarks into gestures (point, pinch, swipe)
- a `useGestureControls` hook that maps gestures to store actions, for example
  swipe left/right → `setLastPage`, pinch on a book → `openBook`

The reader takes its current page from the store, so page-turn gestures can plug straight in.
