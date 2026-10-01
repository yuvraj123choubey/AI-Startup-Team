// Small wrappers around localStorage. They never crash the app
// if storage is blocked (for example in a private window).

export function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable. The app keeps working with in-memory state.
  }
}
