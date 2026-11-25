import { useEffect, useState } from 'react';

const KEY = 'nsc_theme';
const listeners = new Set();

export const getTheme = () => document.documentElement.dataset.theme || 'dark';

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#fafafa' : '#141415');
  listeners.forEach((fn) => fn(theme));
}

// Follow the phone/computer setting until the visitor picks a theme themselves
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', (e) => {
    if (!localStorage.getItem(KEY)) apply(e.matches ? 'light' : 'dark');
  });
}

export function useTheme() {
  const [theme, setTheme] = useState(getTheme);
  useEffect(() => {
    listeners.add(setTheme);
    return () => listeners.delete(setTheme);
  }, []);

  // x, y = where the click happened → circle reveal grows from there
  const toggle = (x = innerWidth / 2, y = 0) => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!document.startViewTransition || reduce) {
      document.documentElement.classList.add('theme-fade');
      apply(next);
      setTimeout(() => document.documentElement.classList.remove('theme-fade'), 400);
      return;
    }
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => apply(next));
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  };

  return { theme, toggle };
}
