'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { topProgress } from '../../lib/progress';

export default function TopLoader() {
  const [visible, setVisible] = useState(false);
  const [pct, setPct] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pathname = usePathname();

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function start() {
    clearTimers();
    setVisible(true);
    setPct(0);
    timers.current.push(setTimeout(() => setPct(15),  10));
    timers.current.push(setTimeout(() => setPct(35), 150));
    timers.current.push(setTimeout(() => setPct(55), 400));
    timers.current.push(setTimeout(() => setPct(72), 900));
    timers.current.push(setTimeout(() => setPct(85), 1800));
  }

  function finish() {
    clearTimers();
    setPct(100);
    timers.current.push(
      setTimeout(() => {
        setVisible(false);
        setPct(0);
      }, 380),
    );
  }

  // API progress events
  useEffect(() => topProgress.subscribe((active) => { if (active) start(); else finish(); }), []);

  // Route-change navigation: finish when pathname settles
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      finish();
    }
  }, [pathname]);

  // Intercept anchor clicks to start bar on navigation
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
      if (a.target === '_blank') return;
      start();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (!visible) return null;

  const isFinishing = pct === 100;

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, pointerEvents: 'none' }}
    >
      {/* Bar */}
      <div
        style={{
          height: '3px',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-bright) 100%)',
          boxShadow: '0 0 12px rgba(220,95,43,0.55), 0 0 4px rgba(220,95,43,0.35)',
          borderRadius: '0 3px 3px 0',
          transition: isFinishing ? 'width 0.18s ease' : 'width 0.38s cubic-bezier(0.4,0,0.2,1)',
          opacity: isFinishing ? 0 : 1,
          transitionProperty: isFinishing ? 'width, opacity' : 'width',
          transitionDuration: isFinishing ? '0.18s, 0.3s' : '0.38s',
          transitionDelay: isFinishing ? '0s, 0.12s' : '0s',
        }}
      />
      {/* Glow spark at leading edge */}
      {!isFinishing && (
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: '-4px',
            transform: 'translateX(-50%)',
            width: '60px',
            height: '11px',
            background: 'radial-gradient(ellipse at center, rgba(220,95,43,0.5) 0%, transparent 70%)',
            filter: 'blur(3px)',
          }}
        />
      )}
    </div>
  );
}
