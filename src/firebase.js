import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, remove } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://signaletique-jardin-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

export const dbSet = async (key, value) => {
  try {
    await set(ref(db, key), value);
    return true;
  } catch (e) {
    console.error(`[Firebase] dbSet('${key}') failed:`, e.code, e.message);
    return false;
  }
};

export const dbGet = async (key) => {
  try {
    const snap = await get(ref(db, key));
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.error(`[Firebase] dbGet('${key}') failed:`, e.code, e.message);
    return null;
  }
};

export const dbRemove = async (key) => {
  try {
    await remove(ref(db, key));
    return true;
  } catch (e) {
    console.error(`[Firebase] dbRemove('${key}') failed:`, e.code, e.message);
    return false;
  }
};

export const dbListen = (key, callback) => {
  const r = ref(db, key);
  const unsub = onValue(
    r,
    (snap) => callback(snap.exists() ? snap.val() : null),
    (e) => console.error(`[Firebase] dbListen('${key}') error:`, e.code, e.message)
  );
  return unsub;
};
