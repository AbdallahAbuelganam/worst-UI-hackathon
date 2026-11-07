// S14 — generic toast. kind: 'like' | 'warn' | 'danger' | 'info'
const layer = document.getElementById('toast-layer');

const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="#D9437A"/></svg>';

export function toast(text, kind = 'warn', ms = 2200) {
  const t = document.createElement('div');
  t.className = `toast toast--${kind}`;
  if (kind === 'like') t.innerHTML = HEART;
  t.appendChild(document.createTextNode(text));
  layer.appendChild(t);
  while (layer.children.length > 4) layer.firstElementChild.remove();
  setTimeout(() => {
    t.classList.add('is-out');
    setTimeout(() => t.remove(), 220);
  }, ms);
}
