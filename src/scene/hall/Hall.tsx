import { Books } from '../shelf/Books';
import { Bookshelf } from '../shelf/Bookshelf';
import { UserBay } from '../shelf/UserBay';
import { Architecture } from './Architecture';
import { Bookcases } from './Bookcases';
import { Furniture } from './Furniture';
import { GothicWindow } from './GothicWindow';
import { HallLighting } from './HallLighting';
import { useHallMaterials } from './materials';
import { NightSky } from './NightSky';

/** The whole library: architecture, window and sky, furniture, light, and the visitor's own shelf. */
export function Hall() {
  const m = useHallMaterials();
  return (
    <>
      <HallLighting m={m} />
      <Architecture m={m} />
      <GothicWindow m={m} />
      <NightSky />
      <Bookcases m={m} />
      <Furniture m={m} />
      <UserBay m={m} />
      <Bookshelf>
        <Books />
      </Bookshelf>
    </>
  );
}
