import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { IonIcon } from "@ionic/react";
import {
  micOutline,
  bookmarkOutline,
  documentTextOutline,
  playOutline,
  pauseOutline,
  reloadOutline,
  copyOutline,
  downloadOutline,
  closeCircleOutline,
  timeOutline,
  analyticsOutline,
  speedometerOutline,
  checkmarkCircleOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";
import { StudioChipScroller } from "../StudioChipScroller";

interface StudioRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChapterMarker {
  timeLabel: string;
  timeSec: number;
  title: string;
  summary: string;
  metric: string;
  category: "goal" | "tactical" | "physical" | "whistle";
}

const CHAPTER_MARKERS: ChapterMarker[] = [
  {
    timeLabel: "00:00",
    timeSec: 0,
    title: "Kick-Off & Formation Setup",
    summary: "Man City establish 3-2-4-1 build-up shape against Arsenal's mid-block 4-4-2.",
    metric: "Initial Shape 4-3-3 vs 4-2-3-1",
    category: "tactical",
  },
  {
    timeLabel: "14:20",
    timeSec: 860,
    title: "Low-Block Compression & Rodri Line-Break",
    summary: "Rodri threads high-difficulty diagonal pass between Rice and Partey into half-space.",
    metric: "Pass Difficulty: 78%",
    category: "tactical",
  },
  {
    timeLabel: "28:45",
    timeSec: 1725,
    title: "Saliba Critical Box Clearance",
    summary: "Saliba denies Haaland tap-in with sliding interception inside the 6-yard area.",
    metric: "xT Prevented: 0.34",
    category: "tactical",
  },
  {
    timeLabel: "42:10",
    timeSec: 2530,
    title: "Goal: Erling Haaland Opener",
    summary: "Haaland latches onto De Bruyne cutback, powering shot into the top-right corner.",
    metric: "108.4 km/h • 0.78 xG",
    category: "goal",
  },
  {
    timeLabel: "44:55",
    timeSec: 2695,
    title: "Goal: Bukayo Saka Equalizer",
    summary: "Saka bursts down right flank in counter-transition, finishing past Ederson.",
    metric: "33.8 km/h • 4 Touches",
    category: "goal",
  },
  {
    timeLabel: "45'+2",
    timeSec: 2700,
    title: "Half-Time Whistle & Tactical Evaluation",
    summary: "Interval reached with parity; City dominate possession while Arsenal strike on break.",
    metric: "Pitch Control: MCI 61% - ARS 39%",
    category: "whistle",
  },
];

const TELEPROMPTER_SCRIPT = [
  {
    cue: "00:00 - ANCHOR STUDIO INTRO",
    speaker: "Studio Anchor",
    text: "Welcome back to Premier League Studio powered by Gamoventure. At the interval here at Etihad Stadium, Manchester City and Arsenal are locked at 1-1 following an intensely tactical opening forty-five minutes of premier championship football.",
  },
  {
    cue: "00:30 - TACTICAL MACRO-ARC: LOW-BLOCK SIEGE",
    speaker: "Lead Tactical Analyst",
    text: "The first half unfolded as a textbook low-block siege. Manchester City held sixty-one percent pitch control, continuously recycling possession across the final third and squeezing Arsenal's defensive block into an eighteen-meter corridor. Arsenal maintained tactical discipline under relentless territorial pressure.",
  },
  {
    cue: "01:05 - THE BREAKTHROUGH: E. HAALAND 42'",
    speaker: "Studio Anchor & Analyst",
    text: "The breakthrough came in the forty-second minute. A patient fourteen-pass sequence saw Kevin De Bruyne slip a pinpoint delivery to Erling Haaland, who unleashed a ferocious one-hundred-and-eight kilometer per hour strike. With an expected goals value of zero-point-seven-eight, it was clinical finishing of the highest order.",
  },
  {
    cue: "01:40 - THE EQUALIZER: B. SAKA 45+1'",
    speaker: "Studio Anchor",
    text: "Yet Arsenal responded with devastating speed right before the whistle. In a rapid four-touch transition from their defensive box, Bukayo Saka clocked the match's top sprint velocity at thirty-three-point-eight kilometers per hour, beating Ederson across goal to restore emotional and tactical equilibrium.",
  },
  {
    cue: "02:15 - SECOND-HALF KEYS: RECOVERY & HIGH PRESS EXHAUSTION",
    speaker: "Lead Tactical Analyst",
    text: "As we look ahead to the second half, the central tactical question will be physical endurance. Can Mikel Arteta's side maintain their ninety-four percent pressing intensity without suffering high-press exhaustion, or will City's control over tempo gradually wear down the Gunners' resistance?",
  },
  {
    cue: "02:50 - TACTICAL VERDICT & RE-JOIN",
    speaker: "Studio Anchor",
    text: "A blockbuster second half awaits. Stay tuned to Gamoventure Premier League Studio for continuous live spatial tracking and tactical intelligence as the teams return to the pitch.",
  },
];

export const StudioRecapModal: React.FC<StudioRecapModalProps> = ({ isOpen, onClose }) => {
  const score = useBaseMemory((s) => s.score);
  const matchClock = useBaseMemory((s) => s.matchClock);

  const [activeTab, setActiveTab] = useState<"teleprompter" | "chapters" | "article">("teleprompter");
  const [isPrompterScrolling, setIsPrompterScrolling] = useState(false);
  const [prompterSpeed, setPrompterSpeed] = useState<number>(1.0);
  const [fontSize, setFontSize] = useState<"standard" | "large" | "prompter">("large");
  const [copiedNotification, setCopiedNotification] = useState(false);

  const prompterContainerRef = useRef<HTMLDivElement | null>(null);

  // Teleprompter Auto-Scroll Loop
  useEffect(() => {
    let animId: number;
    if (isPrompterScrolling && activeTab === "teleprompter") {
      const scrollStep = () => {
        if (prompterContainerRef.current) {
          prompterContainerRef.current.scrollTop += 0.6 * prompterSpeed;
          // Loop back to top if reached bottom
          if (
            prompterContainerRef.current.scrollTop + prompterContainerRef.current.clientHeight >=
            prompterContainerRef.current.scrollHeight - 5
          ) {
            prompterContainerRef.current.scrollTop = 0;
          }
        }
        animId = requestAnimationFrame(scrollStep);
      };
      animId = requestAnimationFrame(scrollStep);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPrompterScrolling, prompterSpeed, activeTab]);

  // Keyboard Escape listener to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSeekChapter = (sec: number) => {
    baseMemory.setMatchClock(sec);
  };

  const handleCopyPrompter = () => {
    const textToCopy = TELEPROMPTER_SCRIPT.map(
      (c) => `=== ${c.cue} (${c.speaker}) ===\n${c.text}\n`
    ).join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const digitalArticleMarkdown = `# Manchester City 1 - 1 Arsenal: Half-Time Tactical Breakdown
**Etihad Stadium | Premier League Matchweek | Gamoventure Studio Intelligence**

### First-Half Summary
At the interval at the Etihad Stadium, Manchester City and Arsenal remain deadlocked at 1-1 after a masterclass in tactical contrast. Pep Guardiola's Manchester City dominated early territorial possession (61% Pitch Control), attempting to dismantle Arsenal's compact 4-4-2 low block.

### Key Moments:
- **42' - E. Haaland (Man City)**: A 14-pass build-up sequence was converted with an emphatic 108.4 km/h strike (0.78 xG, Post-Shot xG 0.94).
- **45+1' - B. Saka (Arsenal)**: A lightning 4-touch counter-transition reached a match-high velocity of 33.8 km/h to slip past Ederson and equalize.

### Tactical Metrics:
- **Pitch Control Dominance**: Man City 61% • Arsenal 39%
- **Pass Difficulty Rating (PDR)**: 86% vs 79%
- **High Press Intensity**: Arsenal 94% work rate sustained over first 45 minutes

*Report generated synthetically by Gamoventure Premier League Studio Insights Engine.*`;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 6, 23, 0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999999,
        padding: "max(12px, env(safe-area-inset-top, 12px)) 12px max(12px, env(safe-area-inset-bottom, 12px)) 12px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "calc(100dvh - 24px)",
          height: "92dvh",
          backgroundColor: "var(--studio-panel-bg)",
          border: "1px solid var(--studio-panel-border)",
          borderRadius: "16px",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.95), 0 0 30px rgba(124, 58, 237, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header Bar with High-Visibility Red/White Close Button */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--studio-panel-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(15, 23, 42, 0.98)",
            flexWrap: "nowrap",
            gap: "10px",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px", minWidth: 0, flex: "1 1 auto" }}>
            <span
              style={{
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                padding: "2px 7px",
                borderRadius: "5px",
                textTransform: "uppercase",
                display: "inline-block",
                flexShrink: 0,
              }}
            >
              Gamoventure
            </span>
            <div style={{ minWidth: 0, width: "100%" }}>
              <div style={{ fontSize: "12.5px", fontWeight: 900, color: "var(--ion-text-color)", lineHeight: "1.25", whiteSpace: "normal" }}>
                Half-Time Studio Teleprompter
              </div>
              <div style={{ fontSize: "9.5px", color: "var(--studio-subtext)", marginTop: "2px", lineHeight: "1.2", whiteSpace: "normal" }}>
                {score.homeTeam} 1 - 1 {score.awayTeam} • Interval (45'+2')
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {copiedNotification && (
              <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
                <IonIcon icon={checkmarkCircleOutline} />
                Copied!
              </span>
            )}
            <button
              onClick={handleCopyPrompter}
              style={{
                backgroundColor: "var(--studio-inner-bg)",
                border: "1px solid var(--studio-panel-border)",
                borderRadius: "6px",
                padding: "5px 8px",
                color: "var(--ion-text-color)",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Copy Teleprompter Script"
            >
              <IonIcon icon={copyOutline} />
              <span style={{ fontSize: "10px" }}>Copy</span>
            </button>

            {/* Clean top-right close '✕' button */}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#f8fafc",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
                flexShrink: 0,
                marginLeft: "4px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ef4444";
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                e.currentTarget.style.color = "#f8fafc";
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Controls with Permanent Grey Scroll Line */}
        <div
          style={{
            padding: "8px 14px",
            backgroundColor: "var(--studio-inner-bg)",
            borderBottom: "1px solid var(--studio-panel-border)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ flex: "1 1 320px", maxWidth: "100%", minWidth: 0 }}>
              <StudioChipScroller gap="8px" marginTopTrack={6} alwaysShowTrack={true}>
                <button
                  onClick={() => setActiveTab("teleprompter")}
                  style={{
                    backgroundColor: activeTab === "teleprompter" ? "var(--ion-color-primary)" : "transparent",
                    border: activeTab === "teleprompter" ? "1px solid var(--ion-color-primary)" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    color: activeTab === "teleprompter" ? "#ffffff" : "var(--studio-subtext)",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <IonIcon icon={micOutline} />
                  <span>Teleprompter</span>
                </button>

                <button
                  onClick={() => setActiveTab("chapters")}
                  style={{
                    backgroundColor: activeTab === "chapters" ? "var(--ion-color-primary)" : "transparent",
                    border: activeTab === "chapters" ? "1px solid var(--ion-color-primary)" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    color: activeTab === "chapters" ? "#ffffff" : "var(--studio-subtext)",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <IonIcon icon={bookmarkOutline} />
                  <span>Chapters</span>
                </button>

                <button
                  onClick={() => setActiveTab("article")}
                  style={{
                    backgroundColor: activeTab === "article" ? "var(--ion-color-primary)" : "transparent",
                    border: activeTab === "article" ? "1px solid var(--ion-color-primary)" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    color: activeTab === "article" ? "#ffffff" : "var(--studio-subtext)",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <IonIcon icon={documentTextOutline} />
                  <span>Publication</span>
                </button>
              </StudioChipScroller>
            </div>

            {/* Teleprompter Playback & Font Size Controls (Shown when on prompter tab) */}
            {activeTab === "teleprompter" && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                {/* Font Size Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "3px", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "6px" }}>
                  <button
                    onClick={() => setFontSize("standard")}
                    style={{
                      background: fontSize === "standard" ? "var(--ion-color-primary)" : "transparent",
                      border: "none",
                      borderRadius: "4px",
                      color: fontSize === "standard" ? "#ffffff" : "#94a3b8",
                      padding: "3px 7px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setFontSize("large")}
                    style={{
                      background: fontSize === "large" ? "var(--ion-color-primary)" : "transparent",
                      border: "none",
                      borderRadius: "4px",
                      color: fontSize === "large" ? "#ffffff" : "#94a3b8",
                      padding: "3px 7px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Large
                  </button>
                  <button
                    onClick={() => setFontSize("prompter")}
                    style={{
                      background: fontSize === "prompter" ? "var(--ion-color-primary)" : "transparent",
                      border: "none",
                      borderRadius: "4px",
                      color: fontSize === "prompter" ? "#ffffff" : "#94a3b8",
                      padding: "3px 7px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    24px
                  </button>
                </div>

                {/* Speed Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "3px", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "6px" }}>
                  {[0.5, 1.0, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPrompterSpeed(s)}
                      style={{
                        background: prompterSpeed === s ? "#38bdf8" : "transparent",
                        border: "none",
                        borderRadius: "4px",
                        color: prompterSpeed === s ? "#020617" : "#94a3b8",
                        padding: "3px 6px",
                        fontSize: "9px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Scroll Auto Play/Pause */}
                <button
                  onClick={() => setIsPrompterScrolling(!isPrompterScrolling)}
                  style={{
                    backgroundColor: isPrompterScrolling ? "#ef4444" : "#10b981",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 9px",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <IonIcon icon={isPrompterScrolling ? pauseOutline : playOutline} />
                  <span>{isPrompterScrolling ? "Pause" : "Auto-Scroll"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Main Body: Exactly ONE visible grey scroll line per screen */}
        <div
          className={`studio-recap-modal-body ${activeTab !== "teleprompter" ? "studio-visible-scrollbar" : ""}`}
          style={{
            padding: "16px 14px",
            overflowY: activeTab !== "teleprompter" ? "auto" : "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* TAB 1: Studio Teleprompter */}
          {activeTab === "teleprompter" && (
            <div
              ref={prompterContainerRef}
              className="studio-visible-scrollbar"
              style={{
                flex: 1,
                height: "100%",
                maxHeight: "58dvh",
                minHeight: "260px",
                overflowY: "auto",
                padding: "16px 16px 16px 14px",
                backgroundColor: "#020617",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {TELEPROMPTER_SCRIPT.map((segment, idx) => (
                <div
                  key={idx}
                  style={{
                    borderLeft: "3px solid #7c3aed",
                    paddingLeft: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        backgroundColor: "rgba(124, 58, 237, 0.25)",
                        color: "#c084fc",
                        fontSize: "9px",
                        fontWeight: 900,
                        fontFamily: "monospace",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {segment.cue}
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>
                      Speaker: {segment.speaker}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "#f8fafc",
                      lineHeight: "1.65",
                      fontWeight: 600,
                      fontSize:
                        fontSize === "prompter"
                          ? "22px"
                          : fontSize === "large"
                          ? "17px"
                          : "14px",
                      letterSpacing: "0.2px",
                    }}
                  >
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Streaming Video Chapter Markers */}
          {activeTab === "chapters" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ fontSize: "12px", color: "var(--studio-subtext)" }}>
                  Click any chapter to seek the match clock and synchronize the studio video timeline.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                {CHAPTER_MARKERS.map((ch, idx) => {
                  const isCurrent = Math.abs(matchClock - ch.timeSec) < 300;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSeekChapter(ch.timeSec)}
                      style={{
                        backgroundColor: isCurrent ? "rgba(124, 58, 237, 0.2)" : "var(--studio-inner-bg)",
                        border: isCurrent ? "1.5px solid var(--ion-color-primary)" : "1px solid var(--studio-panel-border)",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            color: "var(--ion-color-primary)",
                          }}
                        >
                          {ch.timeLabel}
                        </span>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor:
                              ch.category === "goal"
                                ? "rgba(255, 214, 0, 0.2)"
                                : ch.category === "tactical"
                                ? "rgba(0, 229, 255, 0.2)"
                                : "rgba(255, 255, 255, 0.1)",
                            color:
                              ch.category === "goal"
                                ? "#ffd600"
                                : ch.category === "tactical"
                                ? "#00e5ff"
                                : "#ffffff",
                          }}
                        >
                          {ch.metric}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--ion-text-color)" }}>
                        {ch.title}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--studio-subtext)", lineHeight: "1.4" }}>
                        {ch.summary}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Instant Digital Publication */}
          {activeTab === "article" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--studio-subtext)", minWidth: "180px", flex: "1 1 auto" }}>
                  Ready-to-publish digital match report formatted under Premier League editorial guidelines.
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(digitalArticleMarkdown);
                    setCopiedNotification(true);
                    setTimeout(() => setCopiedNotification(false), 2000);
                  }}
                  style={{
                    backgroundColor: "var(--ion-color-primary)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    flexShrink: 0,
                  }}
                >
                  <IonIcon icon={copyOutline} />
                  <span>Copy Markdown</span>
                </button>
              </div>

              <div
                style={{
                  backgroundColor: "#020617",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  padding: "16px",
                  color: "#e2e8f0",
                  fontSize: "12px",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                }}
              >
                {digitalArticleMarkdown}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
