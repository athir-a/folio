import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

/** Shown while the room's textures and models download (first visit only; later they're cached). */
export function LoadingScreen() {
  const { active, progress } = useProgress();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (active || progress < 100) return;
    const timer = setTimeout(() => setGone(true), 700);
    return () => clearTimeout(timer);
  }, [active, progress]);

  if (gone) return null;
  const done = !active && progress >= 100;
  return (
    <div className={`loading ${done ? 'loading--done' : ''}`}>
      <div className="loading__card">
        <strong>Setting up your reading room</strong>
        <div className="loading__bar">
          <div style={{ width: `${Math.round(progress)}%` }} />
        </div>
      </div>
    </div>
  );
}
