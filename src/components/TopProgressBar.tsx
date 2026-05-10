import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

// Tiny event bus so the Suspense fallback can trigger the bar.
type Listener = (active: boolean) => void;
const listeners = new Set<Listener>();
export const routeProgress = {
  start() {
    listeners.forEach((l) => l(true));
  },
  done() {
    listeners.forEach((l) => l(false));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Suspense fallback: shows the top bar without blocking the layout. */
export function RouteProgressFallback() {
  useEffect(() => {
    routeProgress.start();
    return () => routeProgress.done();
  }, []);
  return null;
}

/** Thin top progress bar (NProgress/YouTube style). Mount once at app root. */
export function TopProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const start = () => {
    clearTimers();
    setVisible(true);
    setProgress(15);
    timers.current.push(window.setTimeout(() => setProgress(45), 120));
    timers.current.push(window.setTimeout(() => setProgress(75), 380));
    timers.current.push(window.setTimeout(() => setProgress(90), 800));
  };

  const done = () => {
    clearTimers();
    setProgress(100);
    timers.current.push(
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 280)
    );
  };

  // Trigger on every route change.
  useEffect(() => {
    start();
    const t = window.setTimeout(done, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Subscribe to Suspense fallbacks (lazy chunks).
  useEffect(() => {
    return routeProgress.subscribe((active) => (active ? start() : done()));
  }, []);

  useEffect(() => () => clearTimers(), []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
