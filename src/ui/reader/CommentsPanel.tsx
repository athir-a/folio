import { useEffect, useMemo, useRef } from 'react';
import type { Annotation } from '../../db/libraryDb';
import { HIGHLIGHT_COLOURS, sortAnnotations, useAnnotations } from '../../state/annotationStore';
import { Icon } from './Icon';

/**
 * Sidebar listing every highlight and sticky note in the book, in reading
 * order. Click one to jump to it; comments can be written and edited here.
 */
export function CommentsPanel({ onJump }: { onJump: (a: Annotation) => void }) {
  const list = useAnnotations((s) => s.list);
  const activeId = useAnnotations((s) => s.activeId);
  const setPanelOpen = useAnnotations((s) => s.setPanelOpen);
  const sorted = useMemo(() => sortAnnotations(list), [list]);

  return (
    <aside className="comments-panel" aria-label="Comments">
      <header className="comments-panel__header">
        <h3>
          Comments <span>{list.length}</span>
        </h3>
        <button className="icon-btn" onClick={() => setPanelOpen(false)} aria-label="Close comments">
          <Icon name="close" />
        </button>
      </header>
      <div className="comments-panel__list">
        {sorted.length === 0 ? (
          <p className="comments-panel__empty">
            Select some text to highlight it or add a comment, or use the sticky note tool to pin a note anywhere on a page.
          </p>
        ) : (
          sorted.map((a, i) => (
            <div key={a.id}>
              {(i === 0 || sorted[i - 1].page !== a.page) && <h4 className="comments-panel__page">Page {a.page}</h4>}
              <CommentCard annotation={a} active={a.id === activeId} onJump={onJump} />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function CommentCard({ annotation: a, active, onJump }: { annotation: Annotation; active: boolean; onJump: (a: Annotation) => void }) {
  const { update, remove, setActive } = useAnnotations.getState();
  const card = useRef<HTMLDivElement>(null);

  // bring the card into view when its highlight is clicked on the page
  useEffect(() => {
    if (active) card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <div
      ref={card}
      className={`comment-card ${active ? 'comment-card--active' : ''}`}
      onClick={() => {
        setActive(a.id);
        onJump(a);
      }}
    >
      <div className="comment-card__head">
        <span className="comment-card__kind" style={{ background: a.color }}>
          <Icon name={a.kind === 'note' ? 'note' : 'highlighter'} size={13} />
        </span>
        <span className="comment-card__label">{a.kind === 'note' ? 'Sticky note' : 'Highlight'}</span>
        <time>{new Date(a.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
        <button
          className="icon-btn icon-btn--small"
          onClick={(e) => {
            e.stopPropagation();
            remove(a.id);
          }}
          aria-label="Delete"
          title="Delete"
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
      {a.quote && (
        <blockquote style={{ borderColor: a.color }} title={a.quote}>
          {a.quote}
        </blockquote>
      )}
      <textarea
        value={a.comment}
        placeholder={a.kind === 'note' ? 'Write a note…' : 'Add a comment…'}
        rows={active || a.comment ? 3 : 1}
        autoFocus={active && !a.comment && a.kind === 'highlight'}
        onClick={(e) => e.stopPropagation()}
        onFocus={() => setActive(a.id)}
        onChange={(e) => update(a.id, { comment: e.target.value })}
      />
      {active && a.kind === 'highlight' && (
        <div className="comment-card__colours">
          {HIGHLIGHT_COLOURS.map((c) => (
            <button
              key={c}
              className={`swatch ${c === a.color ? 'swatch--on' : ''}`}
              style={{ background: c }}
              onClick={(e) => {
                e.stopPropagation();
                update(a.id, { color: c });
              }}
              aria-label="Change colour"
            />
          ))}
        </div>
      )}
    </div>
  );
}
