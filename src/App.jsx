import { useState, useRef, useEffect, useCallback } from "react";
import { dbSet, dbGet, dbListen, dbRemove } from "./firebase";

// ─── Config ───────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "jardin2024";   // ← modifiez ce mot de passe
const MAX_PINS       = 10;

const PANEL_TYPES = [
  { id: "espace",    label: "Un espace" },
  { id: "direction", label: "Une direction" },
  { id: "info",      label: "Une information" },
  { id: "autre",     label: "Autre" },
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  input: {
    width: "100%", background: "#0D1117", border: "1.5px solid #2A3A55",
    borderRadius: 8, color: "#F9FAFB", padding: "10px 12px",
    fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  },
  label: { display: "block", color: "#CBD5E1", fontSize: 13, fontWeight: 700, marginBottom: 6 },
  card:  { background: "#111827", border: "1px solid #1F2937", borderRadius: 14 },
  btnPrimary: {
    width: "100%", padding: "12px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, #2563EB, #7C3AED)",
    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  overlay: {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
};

// ─── AdminLogin ───────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, onCancel }) {
  const [pw, setPw]   = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (pw === ADMIN_PASSWORD) { onLogin(); }
    else { setErr(true); setPw(""); setTimeout(() => setErr(false), 1800); }
  };
  return (
    <div style={S.overlay}>
      <div style={{ ...S.card, maxWidth: 360, width: "100%", padding: "32px 28px", borderColor: "#2A3A55", animation: "slideUp .2s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#2563EB,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>🔒</div>
          <h2 style={{ color: "#F9FAFB", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Espace administrateur</h2>
          <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>Entrez le mot de passe admin</p>
        </div>
        <label style={S.label}>Mot de passe</label>
        <input
          type="password" value={pw} autoFocus
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••••••"
          style={{ ...S.input, marginBottom: 6, borderColor: err ? "#EF4444" : "#2A3A55" }}
        />
        {err && <p style={{ color: "#EF4444", fontSize: 12, margin: "0 0 10px", textAlign: "center" }}>Mot de passe incorrect</p>}
        {!err && <div style={{ height: 16 }} />}
        <button onClick={submit} style={S.btnPrimary}>Accéder</button>
        <button onClick={onCancel} style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 8, border: "1px solid #1F2937", background: "transparent", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>Annuler</button>
      </div>
    </div>
  );
}

// ─── PinMarker ────────────────────────────────────────────────────────────────
function PinMarker({ pin, index, isActive, onClick }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(pin); }}
      style={{
        position: "absolute", left: `${pin.x}%`, top: `${pin.y}%`,
        transform: "translate(-50%,-100%)", zIndex: isActive ? 30 : 10,
        cursor: "pointer", filter: isActive ? "drop-shadow(0 0 8px #60A5FA)" : "none",
        transition: "filter .2s",
      }}
    >
      <div style={{
        width: 30, height: 30,
        background: isActive ? "linear-gradient(145deg,#60A5FA,#2563EB)" : "linear-gradient(145deg,#3B82F6,#1D4ED8)",
        borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)",
        border: "2.5px solid rgba(255,255,255,.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 14px rgba(59,130,246,.5)",
      }}>
        <span style={{ transform: "rotate(45deg)", fontSize: 11, fontWeight: 800, color: "#fff" }}>{index + 1}</span>
      </div>
    </div>
  );
}

// ─── PinCallout ───────────────────────────────────────────────────────────────
function PinCallout({ pin, index, isAdmin, onClose, onDelete }) {
  const typeLabel = PANEL_TYPES.find((t) => t.id === pin.panelType)?.label || "";
  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      position: "absolute", left: `${pin.x}%`, top: `${pin.y}%`,
      transform: "translate(-50%, calc(-100% - 42px))", zIndex: 40, width: 240,
      background: "#0D1117", border: "1.5px solid #2563EB55", borderRadius: 10,
      padding: "12px 14px", boxShadow: "0 8px 30px rgba(0,0,0,.7)",
      animation: "popIn .18s cubic-bezier(.34,1.56,.64,1)",
    }}>
      <div style={{ position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 12, height: 12, background: "#0D1117", borderRight: "1.5px solid #2563EB55", borderBottom: "1.5px solid #2563EB55" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ background: "#2563EB22", color: "#60A5FA", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>#{index + 1}</span>
          {typeLabel && <span style={{ color: "#6B7280", fontSize: 10 }}>{typeLabel}</span>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
      </div>
      <p style={{ color: "#F9FAFB", fontSize: 13, fontWeight: 600, margin: "0 0 4px", lineHeight: 1.4 }}>{pin.indication}</p>
      {pin.comment && <p style={{ color: "#9CA3AF", fontSize: 12, margin: "0 0 6px", lineHeight: 1.5 }}>{pin.comment}</p>}
      {pin.name    && <p style={{ color: "#4B5563", fontSize: 11, margin: "0 0 8px" }}>— {pin.name}</p>}
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={() => onDelete(pin.id)} style={{ background: "#1F1215", border: "1px solid #3F1F2A", color: "#EF4444", borderRadius: 6, fontSize: 10, padding: "3px 8px", cursor: "pointer", fontWeight: 600 }}>Supprimer</button>
        </div>
      )}
    </div>
  );
}

// ─── PinForm ──────────────────────────────────────────────────────────────────
function PinForm({ position, onSave, onCancel }) {
  const [panelType, setPanelType]   = useState("");
  const [indication, setIndication] = useState("");
  const [comment, setComment]       = useState("");
  const [name, setName]             = useState("");
  const [error, setError]           = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  const save = () => {
    if (!indication.trim()) { setError(true); inputRef.current?.focus(); return; }
    onSave({ id: Date.now(), x: position.x, y: position.y, panelType, indication: indication.trim(), comment: comment.trim(), name: name.trim(), createdAt: new Date().toISOString() });
  };

  const Row = ({ children, style }) => <div style={{ marginBottom: 16, ...style }}>{children}</div>;

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.card, maxWidth: 440, width: "100%", borderColor: "#2A3A55", boxShadow: "0 32px 80px rgba(0,0,0,.9)", animation: "slideUp .2s ease" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "22px 24px 8px", borderBottom: "1px solid #1F2937", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#2563EB,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📍</div>
          <div>
            <h3 style={{ color: "#F9FAFB", fontSize: 15, fontWeight: 700, margin: 0 }}>Nouvel emplacement</h3>
            <p style={{ color: "#4B5563", fontSize: 12, margin: 0 }}>Position : {position.x.toFixed(1)}% · {position.y.toFixed(1)}%</p>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Panel type */}
          <Row>
            <label style={S.label}>Ce panneau annonce :</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PANEL_TYPES.map((t) => (
                <button key={t.id} onClick={() => setPanelType(t.id)} style={{
                  padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: panelType === t.id ? "2px solid #3B82F6" : "1px solid #1F2937",
                  background: panelType === t.id ? "#1E3A5F" : "#0D1117",
                  color: panelType === t.id ? "#93C5FD" : "#6B7280",
                  transition: "all .15s",
                }}>{t.label}</button>
              ))}
            </div>
          </Row>

          {/* Indication */}
          <Row>
            <label style={S.label}>Qu'y a-t-il à indiquer ici ? <span style={{ color: "#EF4444" }}>*</span></label>
            <input
              ref={inputRef} value={indication}
              onChange={(e) => { setIndication(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Ex : Entrée, Accès au compost, Chemin vers le verger…"
              style={{ ...S.input, borderColor: error ? "#EF4444" : "#2A3A55" }}
            />
            {error && <p style={{ color: "#EF4444", fontSize: 11, marginTop: 4 }}>Ce champ est obligatoire</p>}
          </Row>

          {/* Comment */}
          <Row>
            <label style={S.label}>Commentaire <span style={{ color: "#4B5563", fontWeight: 400 }}>(optionnel)</span></label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Pourquoi cet emplacement, pourquoi ce message…"
              rows={3} style={{ ...S.input, resize: "vertical", lineHeight: 1.5 }}
            />
          </Row>

          {/* Name */}
          <Row style={{ marginBottom: 20 }}>
            <label style={S.label}>Ton prénom <span style={{ color: "#4B5563", fontWeight: 400 }}>(optionnel)</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Ton prénom nous permet de savoir qui est à l'origine de la proposition…"
              style={S.input}
            />
          </Row>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #1F2937", background: "transparent", color: "#6B7280", fontSize: 14, cursor: "pointer" }}>Annuler</button>
            <button onClick={save} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Enregistrer l'emplacement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ClosingPage ──────────────────────────────────────────────────────────────
function ClosingPage({ participantName, allPins, onDone }) {
  const [story, setStory]       = useState("");
  const [submitted, setSubmit]  = useState(false);
  const [saving, setSaving]     = useState(false);

  const submit = async () => {
    setSaving(true);
    if (story.trim()) {
      await dbSet(`stories/${Date.now()}`, { text: story.trim(), name: participantName, createdAt: new Date().toISOString() });
    }
    setSubmit(true);
    setSaving(false);
  };

  if (submitted) {
    return (
      <div style={{ ...S.overlay, background: "#030712", backdropFilter: "none", flexDirection: "column", gap: 0 }}>
        <div style={{ textAlign: "center", maxWidth: 520, padding: "0 24px", animation: "slideUp .35s ease" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🌱</div>
          <h2 style={{ color: "#F9FAFB", fontSize: 26, fontWeight: 800, margin: "0 0 12px" }}>Merci pour ta participation !</h2>
          <p style={{ color: "#6B7280", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Tes propositions ont bien été enregistrées. Elles seront examinées pour construire la signalétique du jardin.
          </p>
          <button onClick={onDone} style={{ ...S.btnPrimary, maxWidth: 260, margin: "0 auto", display: "block" }}>Voir toutes les épingles →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...S.overlay, background: "#030712", backdropFilter: "none", flexDirection: "column" }}>
      <div style={{ ...S.card, maxWidth: 560, width: "100%", borderColor: "#2A3A55", animation: "slideUp .25s ease", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "28px 28px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <h2 style={{ color: "#F9FAFB", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>
            {participantName ? `Merci ${participantName} !` : "Merci !"}
          </h2>
          <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            Tu as placé tous tes emplacements. Avant de voir les résultats, une dernière question :
          </p>
          <p style={{ color: "#E2E8F0", fontSize: 15, fontWeight: 700, lineHeight: 1.6, marginBottom: 16 }}>
            As-tu des souvenirs, anecdotes ou histoires liés au jardin que tu souhaites partager ?
          </p>
          <textarea
            value={story} onChange={(e) => setStory(e.target.value)}
            placeholder="Un moment particulier, une découverte, un souvenir…"
            rows={5} style={{ ...S.input, resize: "vertical", lineHeight: 1.6, marginBottom: 20 }}
            autoFocus
          />
        </div>
        <div style={{ padding: "0 28px 28px", display: "flex", gap: 10 }}>
          <button onClick={() => { setStory(""); submit(); }} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid #1F2937", background: "transparent", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>
            Passer
          </button>
          <button onClick={submit} disabled={saving} style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? .6 : 1 }}>
            {saving ? "Enregistrement…" : "Envoyer et voir les résultats →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ResultsOverlay (visible after quiz) ─────────────────────────────────────
function ResultsOverlay({ pins, stories, isAdmin, onClose, onDeletePin }) {
  const [tab, setTab] = useState("pins");

  const exportCSV = () => {
    if (tab === "pins") {
      const rows = [
        ["#", "Type", "Indication", "Commentaire", "Prénom", "X (%)", "Y (%)", "Date"],
        ...pins.map((p, i) => [i + 1, p.panelType, p.indication, p.comment, p.name, p.x.toFixed(2), p.y.toFixed(2), p.createdAt]),
      ];
      const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv); a.download = "emplacements.csv"; a.click();
    } else {
      const rows = [["Témoignage", "Prénom", "Date"], ...stories.map((s) => [s.text, s.name, s.createdAt])];
      const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv); a.download = "temoignages.csv"; a.click();
    }
  };

  const tabBtn = (id, label, count) => (
    <button onClick={() => setTab(id)} style={{
      padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
      background: tab === id ? "linear-gradient(135deg,#2563EB,#7C3AED)" : "transparent",
      color: tab === id ? "#fff" : "#6B7280",
    }}>
      {label} <span style={{ fontSize: 11, opacity: .7 }}>({count})</span>
    </button>
  );

  return (
    <div style={{ ...S.overlay, alignItems: "flex-start", paddingTop: 0 }}>
      <div style={{ width: "100%", maxWidth: 680, height: "100vh", background: "#0D1117", borderLeft: "1px solid #1F2937", marginLeft: "auto", display: "flex", flexDirection: "column", animation: "slideRight .25s ease" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #1F2937", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h2 style={{ color: "#F9FAFB", fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>Résultats de la consultation</h2>
              <p style={{ color: "#4B5563", fontSize: 13, margin: 0 }}>{pins.length} emplacement{pins.length !== 1 ? "s" : ""} · {stories.length} témoignage{stories.length !== 1 ? "s" : ""}</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={exportCSV} style={{ background: "#111827", border: "1px solid #1F2937", color: "#9CA3AF", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>↓ CSV</button>
              {onClose && <button onClick={onClose} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, paddingBottom: 1 }}>
            {tabBtn("pins", "Emplacements", pins.length)}
            {tabBtn("stories", "Témoignages", stories.length)}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {tab === "pins" && (
            pins.length === 0
              ? <p style={{ color: "#4B5563", textAlign: "center", marginTop: 40 }}>Aucun emplacement enregistré.</p>
              : pins.map((pin, i) => (
                <div key={pin.id} style={{ ...S.card, padding: "14px 16px", marginBottom: 10, borderColor: "#1F2937" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ background: "#2563EB22", color: "#60A5FA", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, flexShrink: 0, marginTop: 1 }}>#{i + 1}</span>
                      <div>
                        <p style={{ color: "#F9FAFB", fontSize: 14, fontWeight: 600, margin: "0 0 3px" }}>{pin.indication}</p>
                        {pin.panelType && <p style={{ color: "#4B5563", fontSize: 11, margin: "0 0 3px" }}>{PANEL_TYPES.find((t) => t.id === pin.panelType)?.label}</p>}
                        {pin.comment   && <p style={{ color: "#9CA3AF", fontSize: 12, margin: "0 0 3px", lineHeight: 1.5 }}>{pin.comment}</p>}
                        {pin.name      && <p style={{ color: "#374151", fontSize: 11, margin: 0 }}>— {pin.name}</p>}
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => onDeletePin(pin.id)} style={{ background: "#1F1215", border: "1px solid #3F1F2A", color: "#EF4444", borderRadius: 6, fontSize: 10, padding: "3px 8px", cursor: "pointer", fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>Supprimer</button>
                    )}
                  </div>
                </div>
              ))
          )}
          {tab === "stories" && (
            stories.length === 0
              ? <p style={{ color: "#4B5563", textAlign: "center", marginTop: 40 }}>Aucun témoignage enregistré.</p>
              : stories.map((s, i) => (
                <div key={i} style={{ ...S.card, padding: "14px 16px", marginBottom: 10, borderColor: "#1F2937" }}>
                  <p style={{ color: "#E2E8F0", fontSize: 14, lineHeight: 1.6, margin: "0 0 6px" }}>{s.text}</p>
                  {s.name && <p style={{ color: "#374151", fontSize: 11, margin: 0 }}>— {s.name}</p>}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [imageSrc,    setImageSrc]    = useState(null);
  const [pins,        setPins]        = useState([]);
  const [stories,     setStories]     = useState([]);
  const [pendingPos,  setPendingPos]  = useState(null);
  const [activePin,   setActivePin]   = useState(null);
  const [notification, setNote]       = useState(null);
  const [phase,       setPhase]       = useState("survey");  // "survey" | "closing" | "results"
  const [lastPinName, setLastPinName] = useState("");
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);

  // myPins = only the pins this session placed (hidden for other participants)
  const [myPinIds,    setMyPinIds]    = useState([]);

  const imgRef  = useRef(null);
  const fileRef = useRef(null);

  const notify = (msg) => { setNote(msg); setTimeout(() => setNote(null), 2500); };

  // ── Firebase listeners ──
  useEffect(() => {
    const unsub1 = dbListen("pins", (val) => {
      setPins(val ? Object.values(val) : []);
    });
    const unsub2 = dbListen("stories", (val) => {
      setStories(val ? Object.values(val) : []);
    });
    // Load persisted image URL
    dbGet("imageUrl").then((url) => { if (url) setImageSrc(url); });
    return () => { unsub1(); unsub2(); };
  }, []);

  // ── Admin: upload plan (stored as Data URL in Firebase) ──
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setImageSrc(dataUrl);
      notify("Enregistrement du plan…");
      const ok = await dbSet("imageUrl", dataUrl);
      if (ok) notify("Plan enregistré pour tous les participants !");
      else notify("⚠️ Erreur Firebase — vérifiez les règles.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Admin: delete plan ──
  const handleDeleteImage = async () => {
    if (!window.confirm("Supprimer le plan pour tous les participants ?")) return;
    await dbRemove("imageUrl");
    setImageSrc(null);
  };

  // ── Participant: place pin ──
  const handleMapClick = useCallback((e) => {
    if (phase !== "survey") return;
    if (myPinIds.length >= MAX_PINS) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setPendingPos({ x, y });
  }, [phase, myPinIds]);

  const handleSavePin = async (pin) => {
    setLastPinName(pin.name);
    const ok = await dbSet(`pins/${pin.id}`, pin);
    if (ok) {
      setMyPinIds((ids) => [...ids, pin.id]);
      setPendingPos(null);
      notify("Emplacement enregistré !");
      if (myPinIds.length + 1 >= MAX_PINS) notify(`Tu as placé ${MAX_PINS} emplacements — c'est le maximum !`);
    } else {
      notify("⚠️ Erreur — emplacement non enregistré.");
    }
  };

  const handleDeletePin = async (id) => {
    await dbRemove(`pins/${id}`);
    setMyPinIds((ids) => ids.filter((i) => i !== id));
    setActivePin(null);
    notify("Emplacement supprimé.");
  };

  // ── Derived ──
  // Participants only see THEIR own pins; admin sees all
  const visiblePins = isAdmin
    ? pins
    : pins.filter((p) => myPinIds.includes(p.id));

  const reachedMax = myPinIds.length >= MAX_PINS;

  // ── Render: results phase ──
  if (phase === "results") {
    return (
      <>
        <GlobalStyles />
        <ResultsOverlay
          pins={pins}
          stories={stories}
          isAdmin={isAdmin}
          onClose={isAdmin ? () => setPhase("survey") : null}
          onDeletePin={isAdmin ? handleDeletePin : undefined}
        />
      </>
    );
  }

  // ── Render: closing phase ──
  if (phase === "closing") {
    return (
      <>
        <GlobalStyles />
        <ClosingPage
          participantName={lastPinName}
          allPins={pins}
          onDone={() => setPhase("results")}
        />
      </>
    );
  }

  // ── Render: survey phase ──
  return (
    <>
      <GlobalStyles />

      {/* Admin login modal */}
      {showLogin && (
        <AdminLogin
          onLogin={() => { setIsAdmin(true); setShowLogin(false); notify("Mode administrateur activé."); }}
          onCancel={() => setShowLogin(false)}
        />
      )}

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#030712", overflow: "hidden" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, flexShrink: 0, background: "#0D1117", borderBottom: "1px solid #1F2937" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#2563EB,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 14 }}>◈</div>
            <span style={{ color: "#F9FAFB", fontWeight: 700, fontSize: 15 }}>PinSign</span>
            <span style={{ color: "#374151", fontSize: 12 }}>Consultation participative</span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Pin counter */}
            {imageSrc && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", border: "1px solid #1F2937", borderRadius: 8, padding: "5px 12px", color: "#6B7280", fontSize: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: reachedMax ? "#EF4444" : "#10B981" }} />
                {myPinIds.length} / {MAX_PINS}
              </div>
            )}

            {/* Admin controls */}
            {isAdmin ? (
              <>
                <button onClick={() => fileRef.current.click()} style={{ background: "#111827", border: "1px solid #2563EB44", color: "#60A5FA", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {imageSrc ? "Changer le plan" : "Charger un plan"}
                </button>
                {imageSrc && (
                  <button onClick={handleDeleteImage} style={{ background: "#1F1215", border: "1px solid #3F1F2A", color: "#EF4444", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                    Supprimer le plan
                  </button>
                )}
                <button onClick={() => setPhase("results")} style={{ background: "linear-gradient(135deg,#1D4ED8,#6D28D9)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", position: "relative" }}>
                  Voir les résultats
                  {pins.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#EF4444", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "1px 5px", minWidth: 18, textAlign: "center" }}>{pins.length}</span>}
                </button>
                <button onClick={() => setIsAdmin(false)} style={{ background: "none", border: "1px solid #1F2937", color: "#4B5563", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>Déconnexion</button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} style={{ background: "none", border: "1px solid #1F2937", color: "#4B5563", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Admin</button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </div>
        </header>

        {/* Instruction bar (participants only, when plan is loaded) */}
        {imageSrc && !isAdmin && (
          <div style={{
            background: reachedMax ? "#1A0F00" : "#0B1628",
            borderBottom: `1px solid ${reachedMax ? "#92400E" : "#1E40AF"}`,
            padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 16,
          }}>
            {reachedMax ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <p style={{ color: "#FCD34D", fontSize: 14, fontWeight: 600, margin: 0 }}>
                  Tu as placé tes {MAX_PINS} emplacements. Clique sur <strong>"J'ai terminé"</strong> pour continuer.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#1D4ED8,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, animation: "pulse 2.5s ease-in-out infinite" }}>👆</div>
                <div>
                  <p style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}>Clique sur le plan pour placer un panneau de signalétique.</p>
                  <p style={{ color: "#6B7280", fontSize: 12, margin: 0 }}>{MAX_PINS - myPinIds.length} emplacement{MAX_PINS - myPinIds.length > 1 ? "s" : ""} restant{MAX_PINS - myPinIds.length > 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
            <button onClick={() => setPhase("closing")} style={{ flexShrink: 0, background: "linear-gradient(135deg,#065F46,#047857)", border: "none", color: "#6EE7B7", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              J'ai terminé →
            </button>
          </div>
        )}

        {/* Map area */}
        <main style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          {!imageSrc ? (
            isAdmin ? (
              <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #1F2937", borderRadius: 20, padding: "60px 40px", textAlign: "center", maxWidth: 480, width: "100%", cursor: "pointer", transition: "all .2s", animation: "fadeDown .4s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.background = "#0D1117"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1F2937"; e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontSize: 52, marginBottom: 16, opacity: .8 }}>🗺</div>
                <h2 style={{ color: "#E5E7EB", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Importer le plan</h2>
                <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                  Importez une image JPG ou PNG de votre espace.<br />Le plan sera visible par tous les participants.
                </p>
                <div style={{ display: "inline-block", background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>Parcourir…</div>
              </div>
            ) : (
              <div style={{ textAlign: "center", animation: "fadeDown .4s ease" }}>
                <div style={{ fontSize: 52, marginBottom: 16, opacity: .4 }}>⏳</div>
                <p style={{ color: "#4B5563", fontSize: 15 }}>En attente du plan de l'administrateur…</p>
              </div>
            )
          ) : (
            <div
              onClick={!isAdmin ? handleMapClick : undefined}
              style={{ position: "relative", display: "inline-block", borderRadius: 12, overflow: "visible", cursor: isAdmin ? "default" : (reachedMax ? "not-allowed" : "crosshair"), boxShadow: "0 0 0 1px #1F2937, 0 24px 80px rgba(0,0,0,.6)" }}
            >
              <img ref={imgRef} src={imageSrc} alt="Plan" draggable={false}
                style={{ display: "block", maxWidth: "100%", maxHeight: "calc(100vh - 170px)", userSelect: "none", WebkitUserDrag: "none", borderRadius: 12 }}
              />
              {visiblePins.map((pin, i) => (
                <PinMarker key={pin.id} pin={pin} index={pins.indexOf(pin)} isActive={activePin?.id === pin.id}
                  onClick={(p) => setActivePin(activePin?.id === p.id ? null : p)}
                />
              ))}
              {activePin && visiblePins.some((p) => p.id === activePin.id) && (
                <PinCallout
                  pin={activePin}
                  index={pins.findIndex((p) => p.id === activePin.id)}
                  isAdmin={isAdmin}
                  onClose={() => setActivePin(null)}
                  onDelete={handleDeletePin}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0F2A1A", border: "1px solid #10B981", color: "#6EE7B7", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, zIndex: 500, animation: "slideUp .2s ease", whiteSpace: "nowrap" }}>
          ✓ {notification}
        </div>
      )}

      {/* Pin form */}
      {pendingPos && (
        <PinForm position={pendingPos} onSave={handleSavePin} onCancel={() => setPendingPos(null)} />
      )}
    </>
  );
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; background: #030712; font-family: 'Sora', sans-serif; }
      @keyframes slideUp    { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
      @keyframes slideRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
      @keyframes popIn      { from { opacity:0; transform:translate(-50%, calc(-100% - 42px)) scale(.85); } to { opacity:1; transform:translate(-50%, calc(-100% - 42px)) scale(1); } }
      @keyframes fadeDown   { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
      @keyframes pulse      { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.7; transform:scale(1.08); } }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-thumb { background: #1F2937; border-radius: 4px; }
      input:focus, textarea:focus { border-color: #3B82F6 !important; outline: none; }
      input::placeholder, textarea::placeholder { color: #374151; }
    `}</style>
  );
}
