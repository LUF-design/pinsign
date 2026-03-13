import { useState, useRef, useEffect } from "react";
import { dbSet, dbGet, dbListen } from "./firebase";

// ─── Keys ─────────────────────────────────────────────────────────────────────
const PINS_KEY    = "pins";
const IMAGE_KEY   = "image";
const STORIES_KEY = "stories";
const MAX_PINS    = 10;

const PANEL_TYPES = [
  { id: "espace",    label: "Un espace" },
  { id: "direction", label: "Une direction" },
  { id: "info",      label: "Une information" },
  { id: "autre",     label: "Autre" },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", background: "#0A0F1E",
  border: "1.5px solid #2A3A55", borderRadius: 8,
  color: "#F9FAFB", padding: "10px 12px",
  fontSize: 14, outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", transition: "border-color .15s",
};
const labelStyle = {
  display: "block", color: "#E2E8F0", fontSize: 13,
  fontWeight: 700, marginBottom: 8,
};
const card = { background: "#111827", border: "1px solid #1F2937", borderRadius: 14 };
const btnPrimary = {
  width: "100%", padding: "12px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg, #2563EB, #7C3AED)",
  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
};

// ─── Pin Marker ───────────────────────────────────────────────────────────────
function PinMarker({ pin, index, isActive, onClick }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(pin); }}
      style={{
        position: "absolute",
        left: `${pin.x}%`, top: `${pin.y}%`,
        transform: "translate(-50%, -100%)",
        zIndex: isActive ? 30 : 10,
        cursor: "pointer",
        filter: isActive ? "drop-shadow(0 0 8px #60A5FA)" : "none",
        transition: "filter .2s",
      }}
    >
      <div style={{
        width: 30, height: 30,
        background: isActive
          ? "linear-gradient(145deg, #60A5FA, #2563EB)"
          : "linear-gradient(145deg, #3B82F6, #1D4ED8)",
        borderRadius: "50% 50% 50% 0",
        transform: "rotate(-45deg)",
        border: "2.5px solid rgba(255,255,255,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 14px rgba(59,130,246,.5)",
        transition: "background .2s",
      }}>
        <span style={{ transform: "rotate(45deg)", fontSize: 11, fontWeight: 800, color: "#fff" }}>
          {index + 1}
        </span>
      </div>
    </div>
  );
}

// ─── Pin Callout ──────────────────────────────────────────────────────────────
function PinCallout({ pin, index, onClose, onDelete }) {
  const typeLabel = PANEL_TYPES.find((t) => t.id === pin.panelType)?.label || "";
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: `${pin.x}%`, top: `${pin.y}%`,
        transform: "translate(-50%, calc(-100% - 42px))",
        zIndex: 40, width: 240,
        background: "#0D1117", border: "1.5px solid #2563EB55",
        borderRadius: 10, padding: "12px 14px",
        boxShadow: "0 8px 30px rgba(0,0,0,.6)",
        animation: "popIn .18s cubic-bezier(.34,1.56,.64,1)",
        pointerEvents: "all",
      }}
    >
      <div style={{ position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 12, height: 12, background: "#0D1117", borderRight: "1.5px solid #2563EB55", borderBottom: "1.5px solid #2563EB55" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ background: "#2563EB22", color: "#60A5FA", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>#{index + 1}</span>
          {typeLabel && <span style={{ color: "#6B7280", fontSize: 10 }}>{typeLabel}</span>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
      </div>
      <p style={{ color: "#F9FAFB", fontSize: 13, fontWeight: 600, margin: "0 0 4px", lineHeight: 1.4 }}>{pin.indication}</p>
      {pin.comment && <p style={{ color: "#9CA3AF", fontSize: 12, margin: "0 0 6px", lineHeight: 1.5 }}>{pin.comment}</p>}
      {pin.name    && <p style={{ color: "#4B5563", fontSize: 11, margin: "0 0 8px" }}>— {pin.name}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#374151", fontSize: 10, fontFamily: "monospace" }}>{pin.x.toFixed(1)}% · {pin.y.toFixed(1)}%</span>
        <button onClick={() => onDelete(pin.id)} style={{ background: "#1F1215", border: "1px solid #3F1F2A", color: "#EF4444", borderRadius: 6, fontSize: 10, padding: "3px 8px", cursor: "pointer", fontWeight: 600 }}>Supprimer</button>
      </div>
    </div>
  );
}

// ─── Pin Form ─────────────────────────────────────────────────────────────────
function PinForm({ position, pinCount, onSave, onCancel }) {
  const [panelType,  setPanelType]  = useState("");
  const [indication, setIndication] = useState("");
  const [comment,    setComment]    = useState("");
  const [name,       setName]       = useState("");
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  const save = () => {
    if (!indication.trim()) { inputRef.current?.focus(); return; }
    onSave({
      id: Date.now(),
      x: position.x, y: position.y,
      panelType, indication: indication.trim(),
      comment: comment.trim(), name: name.trim(),
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ ...card, maxWidth: 440, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,.8)", animation: "slideUp .2s ease", borderColor: "#2A3A55" }}>
        <div style={{ padding: "24px 26px" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {pinCount + 1}
            </div>
            <p style={{ color: "#F9FAFB", fontWeight: 700, fontSize: 16, margin: 0 }}>Nouvel emplacement</p>
          </div>

          {/* Type */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Ce panneau annonce :</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {PANEL_TYPES.map((pt) => (
                <button key={pt.id} onClick={() => setPanelType(pt.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${panelType === pt.id ? "#3B82F6" : "#2A3A55"}`, background: panelType === pt.id ? "#1E3A5F" : "#0A0F1E", cursor: "pointer", transition: "all .15s", textAlign: "left" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `2px solid ${panelType === pt.id ? "#3B82F6" : "#2A3A55"}`, background: panelType === pt.id ? "#3B82F6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                    {panelType === pt.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <span style={{ color: panelType === pt.id ? "#E0EFFF" : "#CBD5E1", fontWeight: panelType === pt.id ? 600 : 400, fontSize: 14 }}>{pt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "#1F2937", margin: "0 0 20px" }} />

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Qu'y a-t-il à indiquer ici ? <span style={{ color: "#EF4444", fontWeight: 400 }}>*</span></label>
            <input ref={inputRef} value={indication} onChange={(e) => setIndication(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="Ex : Entrée, Accès au compost, Chemin vers le verger..." style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Quelque chose à ajouter ? <span style={{ color: "#4B5563", fontSize: 12, fontWeight: 400 }}>(optionnel)</span></label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Pourquoi cet emplacement, pourquoi ce message..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>Ton prénom <span style={{ color: "#4B5563", fontSize: 12, fontWeight: 400 }}>(optionnel)</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom nous permet de savoir qui est à l'origine de la proposition..." style={inputStyle} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={save} disabled={!indication.trim()} style={{ ...btnPrimary, opacity: indication.trim() ? 1 : .4, cursor: indication.trim() ? "pointer" : "not-allowed" }}>
              ✓ Valider cet emplacement
            </button>
            <button onClick={onCancel} style={{ padding: "10px", borderRadius: 8, border: "1px solid #2A3A55", background: "transparent", color: "#9CA3AF", fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Closing Page ─────────────────────────────────────────────────────────────
function ClosingPage({ participantName, onSubmit }) {
  const [story, setStory] = useState("");
  const [done,  setDone]  = useState(false);

  const submit = async () => {
    if (done) return;
    const existing = await dbGet(STORIES_KEY) || {};
    const id = Date.now();
    existing[id] = { id, name: participantName || "Anonyme", story: story.trim(), createdAt: new Date().toISOString() };
    await dbSet(STORIES_KEY, existing);
    setDone(true);
    setTimeout(() => onSubmit(), 1800);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadeIn .5s ease" }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        {!done ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
              <h1 style={{ color: "#F9FAFB", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Merci pour tes suggestions !</h1>
              <p style={{ color: "#6B7280", fontSize: 15, lineHeight: 1.7 }}>Avant de terminer, une dernière question...</p>
            </div>
            <div style={{ ...card, padding: "28px 28px 24px", borderColor: "#2A3A55" }}>
              <p style={{ color: "#F9FAFB", fontSize: 16, fontWeight: 600, lineHeight: 1.6, marginBottom: 20 }}>
                As-tu des anecdotes, souvenirs ou toute autre pensée sur le jardin que tu aimerais partager ?
              </p>
              <textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="Écris ce que tu veux, librement..." rows={5} autoFocus style={{ ...inputStyle, resize: "vertical", marginBottom: 20, fontSize: 15, lineHeight: 1.7 }} />
              <button onClick={submit} style={{ ...btnPrimary, marginBottom: 10 }}>
                {story.trim() ? "Envoyer et terminer" : "Passer et terminer"}
              </button>
              <p style={{ color: "#374151", fontSize: 11, textAlign: "center" }}>Cette question est optionnelle.</p>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", animation: "slideUp .3s ease" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: "#F9FAFB", fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Merci beaucoup !</h2>
            <p style={{ color: "#6B7280", fontSize: 15 }}>Tes réponses ont bien été enregistrées.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────
function ResultsPanel({ pins, stories, onClose, onDelete, onHighlight }) {
  const [tab, setTab] = useState("pins");

  const exportCSV = () => {
    if (tab === "pins") {
      const rows = [
        ["#", "Type", "Indication", "Commentaire", "Prenom", "X (%)", "Y (%)", "Date"],
        ...pins.map((p, i) => [i + 1, p.panelType, p.indication, p.comment, p.name, p.x.toFixed(2), p.y.toFixed(2), p.createdAt]),
      ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([rows], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pinsign-emplacements.csv"; a.click();
    } else {
      const rows = [
        ["Prenom", "Temoignage", "Date"],
        ...stories.map((s) => [s.name, s.story, s.createdAt]),
      ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([rows], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pinsign-temoignages.csv"; a.click();
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "flex-end" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, borderRadius: "16px 0 0 16px", width: 400, height: "100%", display: "flex", flexDirection: "column", animation: "slideRight .25s ease", overflow: "hidden" }}>
        <div style={{ padding: "20px 20px 0", borderBottom: "1px solid #1F2937" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ color: "#F9FAFB", fontSize: 17, fontWeight: 700, margin: 0 }}>Résultats</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 20, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "flex", marginBottom: -1 }}>
            {[{ id: "pins", label: `Emplacements (${pins.length})` }, { id: "stories", label: `Témoignages (${stories.length})` }].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "9px 0", border: "none", borderBottom: tab === t.id ? "2px solid #3B82F6" : "2px solid transparent", background: "transparent", color: tab === t.id ? "#60A5FA" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          {tab === "pins" ? (
            pins.length === 0
              ? <div style={{ textAlign: "center", padding: "3rem 0", color: "#374151" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📍</div><p>Aucun emplacement pour l'instant</p></div>
              : pins.map((p, i) => {
                  const typeLabel = PANEL_TYPES.find((t) => t.id === p.panelType)?.label || "";
                  return (
                    <div key={p.id} onClick={() => { onHighlight(p); onClose(); }}
                      style={{ ...card, padding: "12px 14px", marginBottom: 8, borderLeft: "3px solid #3B82F6", cursor: "pointer", transition: "background .15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#1A2535"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#111827"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                            <span style={{ color: "#60A5FA", fontSize: 10, fontWeight: 700 }}>#{i + 1}</span>
                            {typeLabel && <span style={{ color: "#4B5563", fontSize: 10 }}>· {typeLabel}</span>}
                          </div>
                          <p style={{ color: "#F9FAFB", fontWeight: 600, fontSize: 14, margin: "0 0 2px" }}>{p.indication}</p>
                          {p.comment && <p style={{ color: "#9CA3AF", fontSize: 12, margin: "0 0 2px", lineHeight: 1.5 }}>{p.comment}</p>}
                          {p.name    && <p style={{ color: "#4B5563", fontSize: 11, margin: 0 }}>— {p.name}</p>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} style={{ background: "none", border: "none", color: "#4B5563", cursor: "pointer", fontSize: 16, marginLeft: 8, padding: 0 }}>×</button>
                      </div>
                    </div>
                  );
                })
          ) : (
            stories.length === 0
              ? <div style={{ textAlign: "center", padding: "3rem 0", color: "#374151" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div><p>Aucun témoignage pour l'instant</p></div>
              : stories.map((s) => (
                  <div key={s.id} style={{ ...card, padding: "14px 16px", marginBottom: 10, borderLeft: "3px solid #10B981" }}>
                    <p style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 1.7, margin: "0 0 8px" }}>{s.story || <em style={{ color: "#374151" }}>Aucun texte partagé</em>}</p>
                    <p style={{ color: "#4B5563", fontSize: 11, margin: 0 }}>— {s.name}</p>
                  </div>
                ))
          )}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1F2937" }}>
          <button onClick={exportCSV} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#1F2937", border: "1px solid #374151", color: "#D1D5DB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#374151"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#1F2937"}
          >
            Exporter en CSV
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [imageSrc,     setImageSrc]     = useState(null);
  const [pins,         setPins]         = useState([]);
  const [stories,      setStories]      = useState([]);
  const [pendingPos,   setPendingPos]   = useState(null);
  const [activePin,    setActivePin]    = useState(null);
  const [showResults,  setShowResults]  = useState(false);
  const [showClosing,  setShowClosing]  = useState(false);
  const [lastPinName,  setLastPinName]  = useState("");
  const [notification, setNotification] = useState(null);
  const imgRef  = useRef(null);
  const fileRef = useRef(null);

  // Initial load + real-time listeners
  useEffect(() => {
    const unsubPins = dbListen(PINS_KEY, (val) => {
      setPins(val ? Object.values(val) : []);
    });
    const unsubStories = dbListen(STORIES_KEY, (val) => {
      setStories(val ? Object.values(val) : []);
    });
    dbGet(IMAGE_KEY).then((val) => { if (val) setImageSrc(val); });
    return () => { unsubPins(); unsubStories(); };
  }, []);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 2500); };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setImageSrc(ev.target.result);
      await dbSet(IMAGE_KEY, ev.target.result);
      notify("Plan chargé et partagé !");
    };
    reader.readAsDataURL(file);
  };

  const handleMapClick = (e) => {
    if (pendingPos || showResults || showClosing) return;
    if (activePin) { setActivePin(null); return; }
    if (pins.length >= MAX_PINS) { notify(`Maximum ${MAX_PINS} emplacements atteint.`); return; }
    const rect = imgRef.current.getBoundingClientRect();
    setPendingPos({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  };

  const handleSavePin = async (pin) => {
    setLastPinName(pin.name);
    await dbSet(`${PINS_KEY}/${pin.id}`, pin);
    setPendingPos(null);
    notify("Emplacement enregistré !");
  };

  const handleDelete = async (id) => {
    const updated = pins.filter((p) => p.id !== id);
    const obj = {};
    updated.forEach((p) => { obj[p.id] = p; });
    await dbSet(PINS_KEY, Object.keys(obj).length ? obj : null);
    setActivePin(null);
  };

  const handleClosingDone = () => {
    setShowClosing(false);
    notify("Merci pour ta participation !");
  };

  const reachedMax = pins.length >= MAX_PINS;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #030712; font-family: 'Sora', sans-serif; }
        @keyframes slideUp    { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes popIn      { from { opacity:0; transform:translate(-50%, calc(-100% - 42px)) scale(.85); } to { opacity:1; transform:translate(-50%, calc(-100% - 42px)) scale(1); } }
        @keyframes fadeIn     { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeDown   { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse      { 0%,100% { opacity:1; } 50% { opacity:.6; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1F2937; border-radius: 4px; }
        input:focus, textarea:focus { border-color: #3B82F6 !important; }
        input::placeholder, textarea::placeholder { color: #374151; }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#030712", overflow: "hidden" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, flexShrink: 0, background: "#0D1117", borderBottom: "1px solid #1F2937" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>◈</div>
            <div>
              <span style={{ color: "#F9FAFB", fontWeight: 700, fontSize: 15 }}>PinSign</span>
              <span style={{ color: "#374151", fontSize: 12, marginLeft: 8 }}>Consultation participative</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {imageSrc && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#111827", border: "1px solid #1F2937", borderRadius: 8, padding: "5px 12px", color: "#6B7280", fontSize: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: reachedMax ? "#EF4444" : "#10B981" }} />
                {pins.length} / {MAX_PINS}
              </div>
            )}
            <button onClick={() => fileRef.current.click()} style={{ background: "#111827", border: "1px solid #1F2937", color: "#D1D5DB", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {imageSrc ? "Changer le plan" : "Charger un plan"}
            </button>
            {imageSrc && (
              <button onClick={() => setShowResults(true)} style={{ background: "linear-gradient(135deg, #1D4ED8, #6D28D9)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", position: "relative" }}>
                Résultats
                {(pins.length + stories.length) > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#EF4444", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "1px 5px", minWidth: 18, textAlign: "center" }}>{pins.length + stories.length}</span>}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
        </header>

        {/* Instruction bar */}
        {imageSrc && (
          <div style={{ background: reachedMax ? "#1A0F00" : "#0B1628", borderBottom: `1px solid ${reachedMax ? "#92400E" : "#1E40AF"}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 16 }}>
            {reachedMax ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <p style={{ color: "#FCD34D", fontSize: 14, fontWeight: 600 }}>Tu as placé tes {MAX_PINS} emplacements. Clique sur <strong>"J'ai terminé"</strong> pour continuer.</p>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg, #1D4ED8, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 0 0 4px #1D4ED820", animation: "pulse 2.5s ease-in-out infinite" }}>👆</div>
                <div>
                  <p style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}>Clique sur le plan à l'endroit où tu souhaites placer un panneau de signalétique.</p>
                  <p style={{ color: "#6B7280", fontSize: 12, margin: 0 }}>Tu peux placer jusqu'à {MAX_PINS} emplacements · {MAX_PINS - pins.length} restant{MAX_PINS - pins.length > 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
            <button onClick={() => setShowClosing(true)} style={{ flexShrink: 0, background: "linear-gradient(135deg, #065F46, #047857)", border: "none", color: "#6EE7B7", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              J'ai terminé →
            </button>
          </div>
        )}

        {/* Map */}
        <main style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          {!imageSrc ? (
            <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #1F2937", borderRadius: 20, padding: "60px 40px", textAlign: "center", maxWidth: 480, width: "100%", cursor: "pointer", transition: "all .2s", animation: "fadeDown .4s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.background = "#0D1117"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1F2937"; e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ fontSize: 52, marginBottom: 16, opacity: .8 }}>🗺</div>
              <h2 style={{ color: "#E5E7EB", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Importer votre plan</h2>
              <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>Importez une image JPG ou PNG de votre espace.<br />Le plan sera partagé avec tous les participants.</p>
              <div style={{ display: "inline-block", background: "linear-gradient(135deg, #2563EB, #7C3AED)", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>Parcourir…</div>
            </div>
          ) : (
            <div onClick={handleMapClick} style={{ position: "relative", display: "inline-block", borderRadius: 12, overflow: "visible", cursor: reachedMax ? "not-allowed" : "crosshair", boxShadow: "0 0 0 1px #1F2937, 0 24px 80px rgba(0,0,0,.6)" }}>
              <img ref={imgRef} src={imageSrc} alt="Plan" draggable={false} style={{ display: "block", maxWidth: "100%", maxHeight: "calc(100vh - 170px)", userSelect: "none", WebkitUserDrag: "none", borderRadius: 12 }} />
              {pins.map((pin, i) => (
                <PinMarker key={pin.id} pin={pin} index={i} isActive={activePin?.id === pin.id} onClick={(p) => setActivePin(activePin?.id === p.id ? null : p)} />
              ))}
              {activePin && (
                <PinCallout pin={activePin} index={pins.findIndex((p) => p.id === activePin.id)} onClose={() => setActivePin(null)} onDelete={handleDelete} />
              )}
            </div>
          )}
        </main>
      </div>

      {notification && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0F2A1A", border: "1px solid #10B981", color: "#6EE7B7", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, zIndex: 500, animation: "slideUp .2s ease", whiteSpace: "nowrap" }}>
          ✓ {notification}
        </div>
      )}

      {pendingPos && !showResults && <PinForm position={pendingPos} pinCount={pins.length} onSave={handleSavePin} onCancel={() => setPendingPos(null)} />}
      {showClosing && <ClosingPage participantName={lastPinName} onSubmit={handleClosingDone} />}
      {showResults && <ResultsPanel pins={pins} stories={stories} onClose={() => setShowResults(false)} onDelete={handleDelete} onHighlight={(pin) => { setActivePin(pin); setShowResults(false); }} />}
    </>
  );
}
