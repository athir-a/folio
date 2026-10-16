/** Small line icons for the reader toolbar. */
const PATHS = {
  cursor: 'M5 3l12 6-5 1.5L9.5 16z',
  highlighter: 'M14 4l6 6-8 8H6v-6zM4 20h8',
  note: 'M5 4h14v11l-5 5H5zM14 20v-5h5',
  comments: 'M4 5h16v10H9l-5 4z',
  minus: 'M6 12h12',
  plus: 'M6 12h12M12 6v12',
  fit: 'M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4',
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  hand: 'M8 12V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7a6 6 0 01-6 6h-1a6 6 0 01-5-3l-2-4a1.5 1.5 0 012.5-1.5L8 13',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  copy: 'M8 8h11v11H8zM5 16V5h11',
  close: 'M6 6l12 12M18 6L6 18',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
