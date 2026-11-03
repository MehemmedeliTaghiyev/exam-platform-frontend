export function scrollToHash(hash, { retries = 24 } = {}) {
  const id = String(hash || '').replace(/^#/, '');
  if (!id) return;
  let left = retries;
  const run = () => {
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (left <= 0) return;
    left -= 1;
    window.setTimeout(run, 50);
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(run);
    return;
  }
  run();
}

export function goToHash(navigate, hash, { replace = false } = {}) {
  const id = String(hash || '').replace(/^#/, '');
  if (!id || typeof navigate !== 'function') return;
  navigate({ pathname: '/', hash: `#${id}` }, { replace });
  window.setTimeout(() => scrollToHash(id), 80);
}
