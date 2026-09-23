// URL test hooks. Without a param nothing she sees changes.
const TODS = ['night', 'dawn', 'day', 'eve'];

export function readParams(search) {
  const q = new URLSearchParams(search);
  const num = (k) => {
    if (!q.has(k)) return null;
    const v = parseFloat(q.get(k));
    return Number.isFinite(v) ? v : null;
  };
  const tod = q.get('tod');
  const preview = q.has('preview');
  return {
    full: q.has('full'),
    tod: TODS.includes(tod) ? tod : preview ? 'night' : null,
    gold: q.has('gold'),
    preview,
    t: num('t'),
    seed: num('seed'),
    test: q.has('test'),
    tune: q.has('tune'),
  };
}
