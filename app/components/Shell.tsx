'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import SideBar from './SideBar';
import TopHeader from './TopHeader';

// Deterministic bubble config — stable across renders, no random flicker
const BUBBLES = [
  { left:  '4%',  size: 10, dur: 18, delay:  0   },
  { left: '11%',  size: 16, dur: 22, delay:  3.2 },
  { left: '19%',  size:  7, dur: 15, delay:  1.5 },
  { left: '28%',  size: 22, dur: 26, delay:  6.0 },
  { left: '36%',  size: 12, dur: 20, delay:  9.0 },
  { left: '44%',  size:  8, dur: 17, delay:  2.4 },
  { left: '53%',  size: 18, dur: 24, delay:  4.8 },
  { left: '61%',  size: 14, dur: 21, delay:  7.5 },
  { left: '70%',  size:  9, dur: 16, delay:  0.8 },
  { left: '78%',  size: 24, dur: 28, delay: 11.0 },
  { left: '86%',  size: 11, dur: 19, delay:  5.3 },
  { left: '93%',  size: 15, dur: 23, delay:  8.2 },
  { left:  '7%',  size: 20, dur: 25, delay: 13.0 },
  { left: '48%',  size:  6, dur: 14, delay:  3.7 },
  { left: '65%',  size: 28, dur: 30, delay: 16.0 },
];

function BubbleBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className="bubble-bg-bubble"
          style={{
            left: b.left,
            bottom: '-60px',
            width:  b.size,
            height: b.size,
            background: `radial-gradient(circle at 35% 35%, rgba(220,95,43,0.30), rgba(220,95,43,0.08))`,
            border: '1px solid rgba(220,95,43,0.18)',
            backdropFilter: 'blur(2px)',
            ['--dur' as string]:   `${b.dur}s`,
            ['--delay' as string]: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isAuthRoute = pathname.startsWith('/auth') || pathname.startsWith('/customer');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <BubbleBackground />
      <TopHeader onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 gap-2.5 px-2.5 py-2.5">
        <SideBar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main className="min-w-0 flex-1 overflow-y-auto pb-4">
          {children}
        </main>
      </div>
    </div>
  );
}
