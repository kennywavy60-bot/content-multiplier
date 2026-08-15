import React, { useState, useCallback, useEffect } from "react";

const PLATFORMS = [
  { id: "instagram", label: "Instagram caption", hint: "Punchy, hook first line, hashtags at the end", icon: "◐" },
  { id: "twitter", label: "X thread", hint: "3–6 tweets, numbered, hook on tweet 1", icon: "◑" },
  { id: "linkedin", label: "LinkedIn post", hint: "Professional, short paragraphs, one insight per post", icon: "◒" },
  { id: "tiktok", label: "TikTok script", hint: "Spoken script with on-screen text cues", icon: "◓" },
  { id: "email", label: "Email blurb", hint: "Subject line + 3–4 sentence body", icon: "◔" },
];

const VOICES = [
  "Warm and conversational",
  "Bold and confident",
  "Playful and witty",
  "Minimal and premium",
  "Expert and educational",
];

const STORAGE_KEY = "content-multiplier-history";

function buildPrompt(sourceText, voice, platforms) {
  const platformList = platforms
    .map((p) => {
      const meta = PLATFORMS.find((x) => x.id === p);
      return `- ${meta.label} (id: "${meta.id}"): ${meta.hint}`;
    })
    .join("\n");

  return `You are a senior social media strategist. Repurpose the SOURCE CONTENT below into the requested platform formats, written in a "${voice}" voice.

SOURCE CONTENT:
"""
${sourceText}
"""

Produce content for exactly these platforms:
${platformList}

Rules:
- Stay faithful to the facts and claims in the source content. Do not invent statistics, names, or claims not implied by the source.
- Each platform's output should feel native to that platform, not a copy-paste of the others.
- No markdown formatting inside the output text (no asterisks, no headers).
- Respond with ONLY a JSON object, no preamble, no code fences, in this exact shape:
{"results": [{"platform": "instagram", "content": "..."}, ...]}
One entry per requested platform id, in the order given above.`;
}

async function callBackend(prompt) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data.results;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function persistHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (e) {
    return false;
  }
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{
        background: copied ? "#3E63FF" : "transparent",
        color: copied ? "#F2EFE9" : "#3E63FF",
        border: "1.5px solid #3E63FF",
        borderRadius: "6px",
        padding: "6px 14px",
        fontSize: "12.5px",
        fontWeight: 700,
        letterSpacing: "0.02em",
        cursor: "pointer",
        fontFamily: "'Space Grotesk', sans-serif",
        transition: "all 0.15s ease",
        flexShrink: 0,
      }}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

export default function App() {
  const [sourceText, setSourceText] = useState("");
  const [voice, setVoice] = useState(VOICES[0]);
  const [selectedPlatforms, setSelectedPlatforms] = useState(["instagram", "twitter", "linkedin"]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("compose");
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const saveToHistory = (sourceText, voice, platforms, results) => {
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      sourceText,
      voice,
      platforms,
      results,
    };
    const next = [record, ...history];
    setHistory(next);
    persistHistory(next);
  };

  const deleteHistoryItem = (id) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    persistHistory(next);
    if (activeHistoryItem && activeHistoryItem.id === id) {
      setActiveHistoryItem(null);
      setView("compose");
    }
  };

  const openHistoryItem = (item) => {
    setActiveHistoryItem(item);
    setView("history-detail");
  };

  const togglePlatform = useCallback((id) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const handleGenerate = async () => {
    setError(null);
    if (sourceText.trim().length < 20) {
      setError("Add a bit more source content — at least a couple of sentences.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError("Pick at least one platform.");
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const prompt = buildPrompt(sourceText.trim(), voice, selectedPlatforms);
      const out = await callBackend(prompt);
      setResults(out);
      saveToHistory(sourceText.trim(), voice, selectedPlatforms, out);
    } catch (e) {
      setError(e.message || "Something went wrong generating content.");
    } finally {
      setLoading(false);
    }
  };

  const charCount = sourceText.length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#12151C",
        color: "#F2EFE9",
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Archivo+Black&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::selection { background: #3E63FF; color: #F2EFE9; }
        textarea::placeholder { color: #6B7080; }
        button:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: 2px solid #FFC145;
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "40px 24px 64px" }}>
        <div style={{ marginBottom: "36px" }}>
          <div style={{ display: "inline-block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#FFC145", marginBottom: "10px" }}>
            ONE POST IN → FIVE POSTS OUT
          </div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.05, margin: 0, letterSpacing: "-0.01em" }}>
            Content Multiplier
          </h1>
          <p style={{ color: "#9BA0AE", fontSize: "15px", marginTop: "10px", maxWidth: "540px", lineHeight: 1.5 }}>
            Paste one piece of content. Get it rewritten natively for every platform you post to, in your voice.
          </p>
        </div>

        <div style={{ display: "flex", gap: "4px", marginBottom: "28px", borderBottom: "1.5px solid #2A2F3D" }}>
          {[
            { id: "compose", label: "COMPOSE" },
            { id: "history", label: `HISTORY${history.length ? ` (${history.length})` : ""}` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setView(t.id); setActiveHistoryItem(null); }}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `2.5px solid ${view === t.id || (view === "history-detail" && t.id === "history") ? "#FFC145" : "transparent"}`,
                color: view === t.id || (view === "history-detail" && t.id === "history") ? "#F2EFE9" : "#6B7080",
                padding: "10px 16px 12px",
                fontSize: "12.5px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                marginBottom: "-1.5px",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {view === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {history.length === 0 && (
              <div style={{ border: "1.5px dashed #2A2F3D", borderRadius: "12px", padding: "40px 20px", textAlign: "center", color: "#6B7080", fontSize: "14px" }}>
                Nothing generated yet. Runs you generate on the Compose tab are saved here automatically.
              </div>
            )}
            {history.map((item) => (
              <div key={item.id} style={{ background: "#1A1E28", border: "1.5px solid #2A2F3D", borderRadius: "12px", padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <button onClick={() => openHistoryItem(item)} style={{ background: "transparent", border: "none", textAlign: "left", cursor: "pointer", padding: 0, flex: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
                  <div style={{ fontSize: "11px", color: "#6B7080", marginBottom: "6px", fontWeight: 600, letterSpacing: "0.03em" }}>
                    {new Date(item.timestamp).toLocaleString()} · {item.voice}
                  </div>
                  <div style={{ color: "#D8DBE3", fontSize: "14px", lineHeight: 1.5 }}>
                    {item.sourceText.slice(0, 140)}{item.sourceText.length > 140 ? "…" : ""}
                  </div>
                  <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {item.platforms.map((pid) => {
                      const meta = PLATFORMS.find((p) => p.id === pid);
                      return (
                        <span key={pid} style={{ fontSize: "11px", color: "#9BA0AE", background: "#12151C", padding: "3px 8px", borderRadius: "10px" }}>
                          {meta ? meta.icon : "◐"} {meta ? meta.label : pid}
                        </span>
                      );
                    })}
                  </div>
                </button>
                <button onClick={() => deleteHistoryItem(item.id)} style={{ background: "transparent", border: "1.5px solid #2A2F3D", color: "#6B7080", borderRadius: "6px", padding: "6px 10px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0 }}>
                  DELETE
                </button>
              </div>
            ))}
          </div>
        )}

        {view === "history-detail" && activeHistoryItem && (
          <div>
            <button onClick={() => { setView("history"); setActiveHistoryItem(null); }} style={{ background: "transparent", border: "none", color: "#9BA0AE", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "18px", padding: 0 }}>
              ← Back to history
            </button>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", color: "#9BA0AE", marginBottom: "8px" }}>
                SOURCE CONTENT · {activeHistoryItem.voice}
              </div>
              <div style={{ background: "#1A1E28", border: "1.5px solid #2A2F3D", borderRadius: "10px", padding: "16px", fontSize: "14px", lineHeight: 1.6, color: "#D8DBE3", whiteSpace: "pre-wrap" }}>
                {activeHistoryItem.sourceText}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {activeHistoryItem.results.map((r) => {
                const meta = PLATFORMS.find((p) => p.id === r.platform);
                return (
                  <div key={r.platform} style={{ background: "#1A1E28", border: "1.5px solid #2A2F3D", borderRadius: "12px", padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px" }}>{meta ? meta.icon : "◐"}</span>
                        <span style={{ fontWeight: 700, fontSize: "13.5px", letterSpacing: "0.02em" }}>{meta ? meta.label : r.platform}</span>
                      </div>
                      <CopyButton text={r.content} />
                    </div>
                    <div style={{ fontSize: "14px", lineHeight: 1.65, color: "#D8DBE3", whiteSpace: "pre-wrap" }}>{r.content}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "compose" && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.04em", color: "#9BA0AE", marginBottom: "8px" }}>
                SOURCE CONTENT
              </label>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste a blog post, video transcript, announcement, or just a rough idea..."
                rows={7}
                style={{ width: "100%", background: "#1A1E28", border: "1.5px solid #2A2F3D", borderRadius: "10px", padding: "16px", color: "#F2EFE9", fontSize: "14.5px", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.6, resize: "vertical" }}
              />
              <div style={{ fontSize: "11.5px", color: "#565B6B", marginTop: "6px", textAlign: "right" }}>{charCount} characters</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.04em", color: "#9BA0AE", marginBottom: "8px" }}>
                  BRAND VOICE
                </label>
                <select value={voice} onChange={(e) => setVoice(e.target.value)} style={{ width: "100%", background: "#1A1E28", border: "1.5px solid #2A2F3D", borderRadius: "8px", padding: "11px 14px", color: "#F2EFE9", fontSize: "14px", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {VOICES.map((v) => (<option key={v} value={v}>{v}</option>))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.04em", color: "#9BA0AE", marginBottom: "8px" }}>
                  PLATFORMS
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {PLATFORMS.map((p) => {
                    const active = selectedPlatforms.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlatform(p.id)} style={{ display: "flex", alignItems: "center", gap: "7px", background: active ? "#3E63FF" : "#1A1E28", color: active ? "#F2EFE9" : "#9BA0AE", border: `1.5px solid ${active ? "#3E63FF" : "#2A2F3D"}`, borderRadius: "20px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.12s ease" }}>
                        <span style={{ fontSize: "13px" }}>{p.icon}</span>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={loading} style={{ width: "100%", background: loading ? "#2A2F3D" : "#FFC145", color: loading ? "#9BA0AE" : "#12151C", border: "none", borderRadius: "10px", padding: "16px", fontSize: "15px", fontWeight: 700, letterSpacing: "0.02em", cursor: loading ? "default" : "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.15s ease" }}>
              {loading ? "GENERATING…" : "MULTIPLY THIS CONTENT"}
            </button>

            {error && (
              <div style={{ marginTop: "14px", padding: "12px 16px", background: "rgba(255, 90, 54, 0.1)", border: "1.5px solid #FF5A36", borderRadius: "8px", color: "#FF8A6B", fontSize: "13.5px" }}>
                {error}
              </div>
            )}

            {results && (
              <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.04em", color: "#9BA0AE" }}>RESULTS</div>
                {results.map((r) => {
                  const meta = PLATFORMS.find((p) => p.id === r.platform);
                  return (
                    <div key={r.platform} style={{ background: "#1A1E28", border: "1.5px solid #2A2F3D", borderRadius: "12px", padding: "18px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "14px" }}>{meta ? meta.icon : "◐"}</span>
                          <span style={{ fontWeight: 700, fontSize: "13.5px", letterSpacing: "0.02em" }}>{meta ? meta.label : r.platform}</span>
                        </div>
                        <CopyButton text={r.content} />
                      </div>
                      <div style={{ fontSize: "14px", lineHeight: 1.65, color: "#D8DBE3", whiteSpace: "pre-wrap" }}>{r.content}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
