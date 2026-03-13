import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://signaletique-jardin-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const dbSet = async (key, value) => {
  try { await set(ref(db, key), value); } catch (e) { console.error("dbSet error", e); }
};

export const dbGet = async (key) => {
  try {
    const snap = await get(ref(db, key));
    return snap.exists() ? snap.val() : null;
  } catch (e) { console.error("dbGet error", e); return null; }
};

export const dbListen = (key, callback) => {
  const r = ref(db, key);
  const unsub = onValue(r, (snap) => callback(snap.exists() ? snap.val() : null));
  return unsub; // call to stop listening
};
