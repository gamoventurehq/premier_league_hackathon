import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { IonIcon } from "@ionic/react";
import {
  micOutline,
  bookmarkOutline,
  documentTextOutline,
  playOutline,
  pauseOutline,
  copyOutline,
  checkmarkOutline,
  playSkipBackOutline,
  playSkipForwardOutline,
  radioOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";

interface StudioRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChapterMarker {
  timeLabel: string;
  timeSec: number;
  title: string;
  summary: string;
  metric?: string;
}

const CHAPTER_MARKERS: ChapterMarker[] = [
  {
    timeLabel: "00:00",
    timeSec: 0,
    title: "Kick-off & formation setup",
    summary: "City establish their build-up shape against Arsenal's mid-block.",
  },
  {
    timeLabel: "14:20",
    timeSec: 860,
    title: "Low-block compression",
    summary: "Rodri finds high-difficulty diagonal passing lanes.",
  },
  {
    timeLabel: "28:45",
    timeSec: 1725,
    title: "Critical box clearance",
    summary: "Saliba denies a dangerous attacking opportunity.",
  },
  {
    timeLabel: "42:10",
    timeSec: 2530,
    title: "Haaland opens the scoring",
    summary: "A rapid build-up sequence ends in a goal.",
    metric: "0.78 xG",
  },
  {
    timeLabel: "44:55",
    timeSec: 2695,
    title: "Saka equalizes",
    summary: "Arsenal counter quickly before half-time.",
    metric: "33.8 km/h",
  },
  {
    timeLabel: "45+2'",
    timeSec: 2700,
    title: "Half-time tactical review",
    summary: "Review territorial control and the contrasting approaches.",
  },
];

interface CueScript {
  id: string;
  badge: string;
  headline: string;
  text: string;
  nextTeaser?: string;
  speaker: string;
}

const TELEPROMPTER_SCRIPT: CueScript[] = [
  {
    id: "cue_1",
    badge: "ANCHOR INTRO",
    headline: "Welcome back to Premier League Studio, powered by Gamoventure.",
    text: "At half-time, Manchester City and Arsenal are level at 1-1 after an intensely tactical opening period at the Etihad Stadium.",
    nextTeaser: "Tactical analysis",
    speaker: "Studio Anchor",
  },
  {
    id: "cue_2",
    badge: "TACTICAL MACRO-ARC",
    headline: "A textbook low-block siege across the opening forty-five minutes.",
    text: "Manchester City held sixty-one percent pitch control, continuously recycling possession across the final third and squeezing Arsenal's defensive block into an eighteen-meter corridor. Arsenal maintained tactical discipline under relentless territorial pressure.",
    nextTeaser: "Haaland opening goal",
    speaker: "Lead Tactical Analyst",
  },
  {
    id: "cue_3",
    badge: "THE BREAKTHROUGH: 42'",
    headline: "The deadlock broken: Haaland converts from close range.",
    text: "A patient fourteen-pass sequence saw Kevin De Bruyne slip a pinpoint delivery to Erling Haaland, who unleashed a ferocious one-hundred-and-eight kilometer per hour strike. With an expected goals value of zero-point-seven-eight, it was clinical finishing of the highest order.",
    nextTeaser: "Saka counter equalizer",
    speaker: "Studio Anchor & Analyst",
  },
  {
    id: "cue_4",
    badge: "EQUALIZER: 45+1'",
    headline: "Arsenal strike back with devastating transition pace.",
    text: "Yet Arsenal responded with lightning speed right before the whistle. In a rapid four-touch transition from their defensive box, Bukayo Saka clocked the match's top sprint velocity at thirty-three-point-eight kilometers per hour, beating Ederson across goal to restore equilibrium.",
    nextTeaser: "Second-half tactical outlook",
    speaker: "Studio Anchor",
  },
  {
    id: "cue_5",
    badge: "SECOND-HALF KEYS",
    headline: "Physical endurance and press intensity will decide the fixture.",
    text: "As we look ahead to the second half, the central question will be physical endurance. Can Mikel Arteta's side maintain their ninety-four percent pressing intensity without suffering high-press exhaustion, or will City's control over tempo gradually wear down the Gunners' resistance?",
    nextTeaser: "Re-join coverage",
    speaker: "Lead Tactical Analyst",
  },
  {
    id: "cue_6",
    badge: "STUDIO SIGN-OFF",
    headline: "A blockbuster second half awaits at the Etihad.",
    text: "Stay tuned to Gamoventure Premier League Studio for continuous live spatial tracking and tactical intelligence as both teams return to the pitch.",
    speaker: "Studio Anchor",
  },
];

export const StudioRecapModal: React.FC<StudioRecapModalProps> = ({ isOpen, onClose }) => {
  const score = useBaseMemory((s) => s.score);
  const matchClock = useBaseMemory((s) => s.matchClock);

  const [activeTab, setActiveTab] = useState<"teleprompter" | "chapters" | "article">("teleprompter");
  const [activeCueIndex, setActiveCueIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fontSizePx, setFontSizePx] = useState<number>(18);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1.0);
  const [showMarkdownSource, setShowMarkdownSource] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Smooth auto-scroll loop for presenter mode
  useEffect(() => {
    let animId: number;
    if (isPlaying && activeTab === "teleprompter") {
      const step = () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += 0.5 * scrollSpeed;
          const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 4) {
            scrollContainerRef.current.scrollTop = 0;
          }
        }
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, scrollSpeed, activeTab]);

  if (!isOpen) return null;

  const activeCue = TELEPROMPTER_SCRIPT[activeCueIndex] || TELEPROMPTER_SCRIPT[0];

  const handleNextCue = () => {
    if (activeCueIndex < TELEPROMPTER_SCRIPT.length - 1) {
      setActiveCueIndex(activeCueIndex + 1);
    }
  };

  const handlePrevCue = () => {
    if (activeCueIndex > 0) {
      setActiveCueIndex(activeCueIndex - 1);
    }
  };

  const handleSeekChapter = (sec: number) => {
    baseMemory.setMatchClock(sec);
  };

  const handleCopyReport = async () => {
    const reportText = `Half-Time Match Report: ${score.homeTeam} 1-1 ${score.awayTeam} · 45+2'\n\nFIRST-HALF SUMMARY\nA tactical battle ends level at the break.\nManchester City dominated territorial possession, while Arsenal exploited quick transitions to equalize before half-time.\n\nKEY MOMENTS:\n- 42' Haaland opens the scoring: A rapid build-up sequence ends in a close-range finish.\n- 45+1' Saka equalizes: Arsenal counter quickly before half-time.\n\nTACTICAL METRICS:\n- Pitch Control: MCI 61% - ARS 39%\n- Pass Difficulty Rating: 0.35\n- High Press Work Rate: 94%`;
    await navigator.clipboard.writeText(reportText);
    setCopyFeedback("Copied report ✓");
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleCopyMarkdown = async () => {
    const rawMarkdown = `# ${score.homeTeam} 1 - 1 ${score.awayTeam}: Half-Time Tactical Report\n**Etihad Stadium | Premier League | Gamoventure Studio Intelligence**\n\n### First-Half Summary\nA tactical battle ends level at the break. Manchester City held 61% pitch control while Arsenal maintained a resilient low block and countered effectively.\n\n### Key Moments\n- **42' - E. Haaland (Man City)**: 14-pass sequence culminating in 108.4 km/h strike (0.78 xG).\n- **45+1' - B. Saka (Arsenal)**: 4-touch counter-transition sprint clocked at 33.8 km/h.\n\n### Tactical Metrics\n- Pitch Control: Man City 61% • Arsenal 39%\n- Pass Difficulty Rating (PDR): 0.35\n- High Press Intensity: 94% work rate`;
    await navigator.clipboard.writeText(rawMarkdown);
    setCopyFeedback("Copied Markdown ✓");
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 6, 23, 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: activeTab === "teleprompter" ? "920px" : "780px",
          maxHeight: "88dvh",
          backgroundColor: "#0b1222",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.95), 0 0 24px rgba(124, 58, 237, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* MODAL HEADER: Title, Match Context, Close Button        */}
        {/* ======================================================== */}
        <div
          style={{
            padding: "16px 20px 12px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#0b1222",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 900,
                color: "#c084fc",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
              }}
            >
              GAMOVENTURE STUDIO
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginTop: "2px" }}>
              {activeTab === "teleprompter"
                ? "Half-Time Teleprompter"
                : activeTab === "chapters"
                ? "Match Chapters"
                : "Half-Time Match Report"}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
              {score.homeTeam} 1-1 {score.awayTeam} · Half-time · 45+2'
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {copyFeedback && (
              <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 700 }}>
                {copyFeedback}
              </span>
            )}

            {/* Mode 3 header copy button */}
            {activeTab === "article" && !showMarkdownSource && (
              <button
                onClick={handleCopyReport}
                style={{
                  background: "#7c3aed",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <IonIcon icon={copyOutline} />
                Copy report
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MODE NAVIGATION TABS                                     */}
        {/* ======================================================== */}
        <div
          style={{
            padding: "8px 20px",
            backgroundColor: "#020617",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {/* Tab Selector */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => {
                setActiveTab("teleprompter");
                setIsPlaying(false);
              }}
              style={{
                background: activeTab === "teleprompter" ? "#7c3aed" : "transparent",
                color: activeTab === "teleprompter" ? "#ffffff" : "#94a3b8",
                border: `1px solid ${activeTab === "teleprompter" ? "#7c3aed" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "6px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IonIcon icon={micOutline} />
              Presenter
            </button>

            <button
              onClick={() => {
                setActiveTab("chapters");
                setIsPlaying(false);
              }}
              style={{
                background: activeTab === "chapters" ? "#7c3aed" : "transparent",
                color: activeTab === "chapters" ? "#ffffff" : "#94a3b8",
                border: `1px solid ${activeTab === "chapters" ? "#7c3aed" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "6px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IonIcon icon={bookmarkOutline} />
              Chapters
            </button>

            <button
              onClick={() => {
                setActiveTab("article");
                setIsPlaying(false);
              }}
              style={{
                background: activeTab === "article" ? "#7c3aed" : "transparent",
                color: activeTab === "article" ? "#ffffff" : "#94a3b8",
                border: `1px solid ${activeTab === "article" ? "#7c3aed" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "6px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IonIcon icon={documentTextOutline} />
              Publication
            </button>
          </div>

          {/* Compact Reading Controls (Only on Presenter Tab) */}
          {activeTab === "teleprompter" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Font Size A- / A+ */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "6px",
                  padding: "2px 4px",
                  gap: "2px",
                }}
              >
                <button
                  onClick={() => setFontSizePx(Math.max(14, fontSizePx - 2))}
                  title="Smaller font"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#cbd5e1",
                    padding: "3px 6px",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  A-
                </button>
                <button
                  onClick={() => setFontSizePx(Math.min(26, fontSizePx + 2))}
                  title="Larger font"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#cbd5e1",
                    padding: "3px 6px",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  A+
                </button>
              </div>

              {/* Speed 1x / 1.5x / 2x */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "6px",
                  padding: "2px 4px",
                  gap: "2px",
                }}
              >
                {[1.0, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setScrollSpeed(spd)}
                    style={{
                      background: scrollSpeed === spd ? "#7c3aed" : "transparent",
                      border: "none",
                      borderRadius: "4px",
                      color: scrollSpeed === spd ? "#ffffff" : "#94a3b8",
                      padding: "2px 6px",
                      fontSize: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PRESENTER MODE (Matching media_1793030946395.png) */}
        {/* ======================================================== */}
        {activeTab === "teleprompter" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "20px 24px 16px 24px",
              overflow: "hidden",
            }}
          >
            {/* Top Cue Meta Strip */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    backgroundColor: "rgba(124, 58, 237, 0.25)",
                    color: "#c084fc",
                    fontSize: "10px",
                    fontWeight: 900,
                    letterSpacing: "0.5px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    textTransform: "uppercase",
                  }}
                >
                  {activeCue.badge}
                </span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Speaker: {activeCue.speaker}
                </span>
              </div>

              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>
                Cue {activeCueIndex + 1} of {TELEPROMPTER_SCRIPT.length}
              </span>
            </div>

            {/* Main Reading Workspace (Constrained Width for Comfortable Reading) */}
            <div
              ref={scrollContainerRef}
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                maxWidth: "720px",
                margin: "0 auto",
                width: "100%",
                padding: "16px 0",
              }}
            >
              {/* Spoken Headline */}
              <div
                style={{
                  fontSize: `${fontSizePx + 4}px`,
                  fontWeight: 800,
                  color: "#f8fafc",
                  lineHeight: 1.4,
                  marginBottom: "14px",
                }}
              >
                {activeCue.headline}
              </div>

              {/* Spoken Body Text */}
              <div
                style={{
                  fontSize: `${fontSizePx}px`,
                  color: "#cbd5e1",
                  lineHeight: 1.65,
                  fontWeight: 500,
                }}
              >
                {activeCue.text}
              </div>

              {/* Next Cue Teaser Peek */}
              {activeCue.nextTeaser && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "24px",
                    fontSize: "12px",
                    color: "#94a3b8",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#7c3aed",
                    }}
                  />
                  <span>Next: {activeCue.nextTeaser}</span>
                </div>
              )}
            </div>

            {/* Presenter Footer Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "14px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                marginTop: "12px",
              }}
            >
              {/* Skip and Playback Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={handlePrevCue}
                  disabled={activeCueIndex === 0}
                  title="Previous cue"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "none",
                    borderRadius: "6px",
                    color: activeCueIndex === 0 ? "#475569" : "#cbd5e1",
                    padding: "6px 10px",
                    cursor: activeCueIndex === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <IonIcon icon={playSkipBackOutline} />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? "Pause auto-scroll" : "Start auto-scroll"}
                  style={{
                    background: isPlaying ? "#ef4444" : "#10b981",
                    border: "none",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  <IonIcon icon={isPlaying ? pauseOutline : playOutline} />
                </button>

                <button
                  onClick={handleNextCue}
                  disabled={activeCueIndex === TELEPROMPTER_SCRIPT.length - 1}
                  title="Next cue"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "none",
                    borderRadius: "6px",
                    color: activeCueIndex === TELEPROMPTER_SCRIPT.length - 1 ? "#475569" : "#cbd5e1",
                    padding: "6px 10px",
                    cursor: activeCueIndex === TELEPROMPTER_SCRIPT.length - 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <IonIcon icon={playSkipForwardOutline} />
                </button>
              </div>

              {/* Status */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#34d399", fontWeight: 700 }}>
                <IonIcon icon={radioOutline} />
                <span>Presenter controls active</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CHAPTERS TIMELINE (Matching media_1793030982347)  */}
        {/* ======================================================== */}
        {activeTab === "chapters" && (
          <div
            style={{
              padding: "16px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header info */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>
                Match chapters
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                {CHAPTER_MARKERS.length} moments
              </span>
            </div>

            {/* Chronological List of Chapters */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {CHAPTER_MARKERS.map((ch, idx) => {
                const isCurrent = Math.abs(matchClock - ch.timeSec) < 180;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSeekChapter(ch.timeSec)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      backgroundColor: isCurrent ? "rgba(124, 58, 237, 0.15)" : "transparent",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: isCurrent ? "#c084fc" : "#94a3b8",
                          fontVariantNumeric: "tabular-nums",
                          minWidth: "45px",
                          marginTop: "2px",
                        }}
                      >
                        {ch.timeLabel}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#f8fafc" }}>
                            {ch.title}
                          </span>
                          {ch.metric && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#00e5ff",
                                background: "rgba(0, 229, 255, 0.1)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: 700,
                              }}
                            >
                              {ch.metric}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px", lineHeight: 1.4 }}>
                          {ch.summary}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Seek to chapter"
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        color: isCurrent ? "#c084fc" : "#cbd5e1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginLeft: "12px",
                      }}
                    >
                      <IonIcon icon={playOutline} style={{ fontSize: "13px" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PUBLICATION PREVIEW (Matching media_1793031046962)*/}
        {/* ======================================================== */}
        {activeTab === "article" && (
          <div
            style={{
              padding: "16px 20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {!showMarkdownSource ? (
              /* Rendered Report Preview (Default) */
              <div>
                {/* Header Summary */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.5px" }}>
                    FIRST-HALF SUMMARY
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", marginTop: "4px", marginBottom: "8px" }}>
                    A tactical battle ends level at the break
                  </div>
                  <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>
                    Manchester City dominated territorial possession, while Arsenal exploited quick transitions to equalize before half-time.
                  </div>
                </div>

                {/* Key Moments */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.5px", marginBottom: "10px" }}>
                    KEY MOMENTS
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", paddingBottom: "10px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#00e5ff", minWidth: "26px" }}>42'</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                          Haaland opens the scoring
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                          A sustained 14-pass build-up culminates in an emphatic finish from close range.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#f43f5e", minWidth: "26px" }}>45+1'</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                          Saka restores parity
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                          Arsenal respond with a swift 4-touch counter-attack before the interval.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tactical Key Evaluation */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "12px",
                    color: "#cbd5e1",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <span>Pitch Control: <strong style={{ color: "#00e5ff" }}>MCI 61%</strong> vs <strong style={{ color: "#f43f5e" }}>ARS 39%</strong></span>
                  <span>Pass Difficulty: <strong style={{ color: "#f59e0b" }}>0.35</strong></span>
                  <span>Press Work Rate: <strong style={{ color: "#10b981" }}>94%</strong></span>
                </div>
              </div>
            ) : (
              /* Raw Markdown Source View (On-Demand) */
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Markdown Source View</span>
                  <button
                    onClick={handleCopyMarkdown}
                    style={{
                      background: "#7c3aed",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <IonIcon icon={copyOutline} />
                    Copy Markdown
                  </button>
                </div>
                <div
                  style={{
                    backgroundColor: "#020617",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    padding: "14px",
                    color: "#94a3b8",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {`# Manchester City 1 - 1 Arsenal: Half-Time Tactical Report\n**Etihad Stadium | Premier League | Gamoventure Studio Intelligence**\n\n### First-Half Summary\nA tactical battle ends level at the break. Manchester City held 61% pitch control while Arsenal maintained a resilient low block and countered effectively.\n\n### Key Moments\n- **42' - E. Haaland (Man City)**: 14-pass sequence culminating in 108.4 km/h strike (0.78 xG).\n- **45+1' - B. Saka (Arsenal)**: 4-touch counter-transition sprint clocked at 33.8 km/h.\n\n### Tactical Metrics\n- Pitch Control: Man City 61% • Arsenal 39%\n- Pass Difficulty Rating (PDR): 0.35\n- High Press Intensity: 94% work rate`}
                </div>
              </div>
            )}

            {/* Bottom Footer Switcher */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "16px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                {showMarkdownSource ? "Viewing raw Markdown" : "Formatted for publication"}
              </span>

              <button
                onClick={() => setShowMarkdownSource(!showMarkdownSource)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#c084fc",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: 0,
                }}
              >
                <span>{showMarkdownSource ? "← Back to Report Preview" : "View Markdown source"}</span>
                <IonIcon icon={arrowForwardOutline} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
