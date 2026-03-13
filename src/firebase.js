import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, remove } from "firebase/database";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  // Remplacez ces valeurs par celles de votre projet Firebase
  // Console Firebase → Paramètres du projet → Vos applications → SDK
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "signaletique-jardin.firebaseapp.com",
  databaseURL:       "https://signaletique-jardin-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "signaletique-jardin",
  storageBucket:     "signaletique-jardin.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId:             "VOTRE_APP_ID",
};

const app     = initializeApp(firebaseConfig);
const db      = getDatabase(app);
const storage = getStorage(app);

// ── Realtime Database ──────────────────────────────────────────────────────
export const dbSet = async (key, value) => {
  try { await set(ref(db, key), value); return true; }
  catch (e) { console.error(`[DB] set('${key}') failed:`, e.message); return false; }
};

export const dbGet = async (key) => {
  try {
    const snap = await get(ref(db, key));
    return snap.exists() ? snap.val() : null;
  } catch (e) { console.error(`[DB] get('${key}') failed:`, e.message); return null; }
};

export const dbRemove = async (key) => {
  try { await remove(ref(db, key)); return true; }
  catch (e) { console.error(`[DB] remove('${key}') failed:`, e.message); return false; }
};

export const dbListen = (key, callback) => {
  return onValue(
    ref(db, key),
    (snap) => callback(snap.exists() ? snap.val() : null),
    (e)    => console.error(`[DB] listen('${key}') error:`, e.message)
  );
};

// ── Firebase Storage (pour l'image du plan) ────────────────────────────────
export const uploadPlan = async (file) => {
  try {
    const storageRef = sRef(storage, "plan/map.jpg");
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    // Sauvegarde l'URL dans la base pour que tous les clients la récupèrent
    await dbSet("imageUrl", url);
    return url;
  } catch (e) {
    console.error("[Storage] uploadPlan failed:", e.message);
    return null;
  }
};

export const deletePlan = async () => {
  try {
    await deleteObject(sRef(storage, "plan/map.jpg"));
    await dbRemove("imageUrl");
    return true;
  } catch (e) {
    console.error("[Storage] deletePlan failed:", e.message);
    return false;
  }
};
