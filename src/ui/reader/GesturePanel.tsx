import { useEffect, useRef, useState } from 'react';
import { WaveDetector, type Swipe } from '../../lib/waveDetector';

type Status = 'starting' | 'watching' | 'blocked' | 'unsupported';

/**
 * Watches the webcam while reading and turns the page when you wave:
 * sweep your hand to the left for the next page, to the right to go back.
 * Shows a small mirrored preview so you can see what the camera sees.
 */
export function GesturePanel({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('starting');
  const [flash, setFlash] = useState<{ dir: Swipe; key: number } | null>(null);
  // the detector outlives renders, so it reads the latest handlers through a ref
  const handlers = useRef({ onNext, onPrev });
  handlers.current = { onNext, onPrev };

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    let stopped = false;
    const detector = new WaveDetector(
      (dir) => {
        if (dir === 'left') handlers.current.onNext();
        else handlers.current.onPrev();
        setFlash({ dir, key: performance.now() });
      },
      // move the dot without re-rendering React thirty times a second
      ({ x }) => {
        const marker = markerRef.current;
        if (!marker) return;
        marker.style.opacity = x === null ? '0' : '1';
        if (x !== null) marker.style.left = `${x * 100}%`;
      },
    );
    detector
      .start()
      .then(() => {
        if (stopped) return detector.stop();
        if (videoRef.current) videoRef.current.srcObject = detector.mediaStream;
        setStatus('watching');
      })
      .catch((err) => {
        console.warn('camera unavailable', err);
        if (!stopped) setStatus('blocked');
      });
    return () => {
      stopped = true;
      detector.stop();
    };
  }, []);

  return (
    <aside className="gesture-panel" aria-live="polite">
      <div className="gesture-panel__view">
        <video ref={videoRef} autoPlay muted playsInline />
        <div ref={markerRef} className="gesture-panel__marker" />
        {flash && (
          <span key={flash.key} className="gesture-panel__flash">
            {flash.dir === 'left' ? '‹ next' : 'back ›'}
          </span>
        )}
      </div>
      <span className="gesture-panel__hint">
        {status === 'watching' && 'Wave left for next page, right to go back'}
        {status === 'starting' && 'Starting camera…'}
        {status === 'blocked' && 'Camera blocked. Allow it in your browser to use gestures'}
        {status === 'unsupported' && 'This browser has no camera access'}
      </span>
    </aside>
  );
}
