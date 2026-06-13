export function loadJSON(key, fallback = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch { return fallback; }
}

export function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadCounter(key, fallback = 1) {
  return parseInt(localStorage.getItem(key)) || fallback;
}

export function saveCounter(key, value) {
  localStorage.setItem(key, String(value));
}
