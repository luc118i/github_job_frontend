import { useRef, useState } from 'react';

interface TagFilterBarProps {
  tags: string[];
  active: string;
  count: number;
  onChange: (tag: string) => void;
}

export function TagFilterBar({ tags, active, count, onChange }: TagFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const moved = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  function onMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return;
    dragging.current = true;
    moved.current = false;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    setIsDragging(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    if (Math.abs(walk) > 4) moved.current = true;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  }

  function onMouseUp() {
    dragging.current = false;
    setIsDragging(false);
  }

  function handleTagClick(tag: string) {
    // ignora o click se foi um drag
    if (moved.current) return;
    onChange(tag);
  }

  return (
    <div className="tfb-root">
      <span className="tfb-count">{count} vagas</span>

      <div className="tfb-scroll-wrap">
        <div
          ref={scrollRef}
          className={`tfb-scroll${isDragging ? ' tfb-scroll--dragging' : ''}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <button
            className={`tfb-tag${active === 'all' ? ' tfb-tag--active' : ''}`}
            onClick={() => handleTagClick('all')}
          >
            todos
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              className={`tfb-tag${active === tag ? ' tfb-tag--active' : ''}`}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Fade edges — hint de scroll */}
        <div className="tfb-fade tfb-fade--left" />
        <div className="tfb-fade tfb-fade--right" />
      </div>
    </div>
  );
}
