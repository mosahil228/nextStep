// Controls the logo loader that lives in index.html
const START = 0; // measured from when the page started loading
const FIRST_VISIT = !sessionStorage.getItem('nsc_seen_splash');
// full logo animation on the first visit of a session, a shorter one afterwards
const MIN_TIME = FIRST_VISIT ? 1200 : 500;
let done = false;

export function hideSplash() {
  if (done) return;
  done = true;
  const el = document.getElementById('splash');
  if (!el) return;
  const wait = Math.max(0, MIN_TIME - (performance.now() - START));
  setTimeout(() => {
    el.classList.add('out');
    sessionStorage.setItem('nsc_seen_splash', '1');
    setTimeout(() => {
      el.remove();
    }, 350);
  }, wait);
}

// Safety net: never keep the loader longer than 7 seconds (e.g. slow network)
setTimeout(hideSplash, 7000);
