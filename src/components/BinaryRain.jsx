import { useEffect, useRef } from 'react';

// Subtle falling binary code — a nod to the logo
export default function BinaryRain({ opacity = 0.35 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, cols, drops, raf;
    const fs = 14;
    const resize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(1, 1);
      cols = Math.floor(w / (fs * devicePixelRatio * 1.6));
      drops = Array.from({ length: cols }, () => Math.random() * -60);
    };
    resize();
    window.addEventListener('resize', resize);
    let fade = 'rgba(7, 13, 38, 0.18)', color = 'rgba(126, 226, 168, 0.55)';
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      fade = cs.getPropertyValue('--rain-fade').trim() || fade;
      color = cs.getPropertyValue('--rain-color').trim() || color;
      ctx.clearRect(0, 0, w, h);
    };
    readColors();
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    let last = 0;
    const draw = (t) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 70) return;
      last = t;
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fs * devicePixelRatio}px JetBrains Mono, monospace`;
      for (let i = 0; i < cols; i++) {
        const x = i * fs * devicePixelRatio * 1.6;
        const y = drops[i] * fs * devicePixelRatio;
        ctx.fillStyle = Math.random() > 0.97 ? '#FF8A1F' : color;
        ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, y);
        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    if (!reduce) raf = requestAnimationFrame(draw);
    return () => { mo.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="binary-rain" style={{ opacity }} aria-hidden />;
}
