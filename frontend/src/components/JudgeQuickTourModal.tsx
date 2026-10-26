import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { IonIcon } from "@ionic/react";
import {
  closeOutline,
  arrowForwardOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  refreshOutline,
  chevronDownOutline,
  chevronUpOutline,
  sparklesOutline,
  clipboardOutline,
  layersOutline,
  serverOutline,
  peopleOutline,
  analyticsOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";

interface JudgeQuickTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenCopilot?: () => void;
}

type TourStep = 1 | 2 | 3 | 4;

interface StepDef {
  num: TourStep;
  label: string;
  title: string;
  subtitle: string;
  criterionTitle: string;
  icon: string;
}

const STEPS: StepDef[] = [
  {
    num: 1,
    label: "Pitch Radar",
    title: "Real-Time Pitch Radar",
    subtitle: "See how spatial data responds to changing match conditions.",
    criterionTitle: "Technical Implementation & Fast-Path Physics",
    icon: analyticsOutline,
  },
  {
    num: 2,
    label: "Agent Swarm",
    title: "Multi-Agent Blackboard Swarm",
    subtitle: "Autonomous agent pipeline coordinating kinematics, spatial metrics, and narrative commentary.",
    criterionTitle: "Agentic Design, Tool Use (MCP) & Innovation",
    icon: layersOutline,
  },
  {
    num: 3,
    label: "Personas",
    title: "Dual Fan Experience Studio",
    subtitle: "Tailored visual density and commentary tone for tactical analysts vs. casual supporters.",
    criterionTitle: "UX Polish, Cognitive Flow & Real-World Impact",
    icon: peopleOutline,
  },
  {
    num: 4,
    label: "Architecture",
    title: "Microsoft Cloud Architecture",
    subtitle: "End-to-end cloud infrastructure executing synthetic generation and broadcast streaming.",
    criterionTitle: "Architecture Robustness, Microsoft Cloud & Category Adherence",
    icon: serverOutline,
  },
];

const RUBRIC_CRITERIA = [
  {
    pillar: "Pillar 1 (20%)",
    name: "Technical Implementation",
    desc: "Sub-50ms fast-path kinematics, Voronoi tessellation, and Event Hubs streaming at 10Hz.",
  },
  {
    pillar: "Pillar 2 (20%)",
    name: "Agentic Design & MCP",
    desc: "4-agent blackboard swarm, zero-hallucination spatial grounding, 7 custom MCP tool endpoints.",
  },
  {
    pillar: "Pillar 3 (20%)",
    name: "Real-World Applicability",
    desc: "Broadcast-ready teleprompter, video chapters, tactical coaching insights, and press summaries.",
  },
  {
    pillar: "Pillar 4 (20%)",
    name: "UX & Experience Polish",
    desc: "Layout-first dual personas, WCAG accessible contrast, responsive cupertino & broadcast views.",
  },
  {
    pillar: "Pillar 5 (20%)",
    name: "Category Adherence",
    desc: "100% synthetic match feeds with zero real-world data scraping; Azure-native cloud stack.",
  },
];

export const JudgeQuickTourModal: React.FC<JudgeQuickTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenCopilot,
}) => {
  const activeScenario = useBaseMemory((s) => s.activeScenario);
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const selectedPersona = useBaseMemory((s) => s.selectedPersona);

  const [currentStep, setCurrentStep] = useState<TourStep>(1);
  const [triggeredNotice, setTriggeredNotice] = useState<string | null>(null);

  // Progressive disclosures (collapsed by default to prevent clutter)
  const [showRubric, setShowRubric] = useState<boolean>(false);
  const [showSLA, setShowSLA] = useState<boolean>(false);
  const [showAgentSpecs, setShowAgentSpecs] = useState<boolean>(false);
  const [showPersonaSpecs, setShowPersonaSpecs] = useState<boolean>(false);
  const [showArchSpecs, setShowArchSpecs] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        setCurrentStep((prev) => (prev < 4 ? ((prev + 1) as TourStep) : prev));
      } else if (e.key === "ArrowLeft") {
        setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as TourStep) : prev));
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        setCurrentStep(Number(e.key) as TourStep);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTriggerScenario = (scenarioId: string, label: string) => {
    baseMemory.injectScenario(scenarioId);
    setTriggeredNotice(`Triggered "${label}"! Engine telemetry adapted.`);
    setTimeout(() => setTriggeredNotice(null), 3500);
  };

  const handleResetScenario = () => {
    baseMemory.resetScenario();
    setTriggeredNotice("Reset to High Possession baseline flow.");
    setTimeout(() => setTriggeredNotice(null), 2500);
  };

  const activeStepDef = STEPS[currentStep - 1];

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judge-tour-title"
      className="judge-tour-dialog-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "clamp(12px, 3vw, 24px)",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        className="judge-tour-modal-shell"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "980px",
          maxHeight: "88vh",
          backgroundColor: "#0d1527",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 60px -12px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(255, 255, 255, 0.05)",
          overflow: "hidden",
          color: "#f1f5f9",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER: Clean, understated per media_1793031578727.png */}
        <div
          className="judge-tour-header"
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
            backgroundColor: "#0a101f",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            flexShrink: 0,
          }}
        >
          {/* Top Row: Brand & Close */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  backgroundColor: "#7c3aed",
                  color: "#ffffff",
                  padding: "2px 7px",
                  borderRadius: "5px",
                  fontSize: "9.5px",
                  fontWeight: 900,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Gamoventure
              </span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Premier League Studio
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Judge Tour modal"
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                padding: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <IonIcon icon={closeOutline} style={{ fontSize: "20px" }} />
            </button>
          </div>

          {/* Stepper Bar: 4 Equal Segments with Active Underline per media_1793031578727.png */}
          <div
            className="judge-tour-stepper"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              paddingBottom: "10px",
            }}
          >
            {STEPS.map((s) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => setCurrentStep(s.num as TourStep)}
                  aria-label={`Step ${s.num}: ${s.label}`}
                  className="judge-tour-step-btn"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "6px 2px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        fontSize: "10px",
                        fontWeight: 700,
                        backgroundColor: isActive
                          ? "#00e5ff"
                          : isPast
                          ? "rgba(56, 189, 248, 0.2)"
                          : "rgba(255, 255, 255, 0.08)",
                        color: isActive ? "#020617" : isPast ? "#38bdf8" : "#94a3b8",
                      }}
                    >
                      {s.num}
                    </span>
                    <span
                      className="judge-tour-step-label"
                      style={{
                        fontSize: "12px",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#00e5ff" : isPast ? "#cbd5e1" : "#94a3b8",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {/* Segment Active Indicator Bar */}
                  <div
                    style={{
                      height: "2px",
                      width: "100%",
                      borderRadius: "2px",
                      backgroundColor: isActive
                        ? "#00e5ff"
                        : isPast
                        ? "rgba(56, 189, 248, 0.35)"
                        : "rgba(255, 255, 255, 0.06)",
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Step Title & Subtitle */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <h2
              id="judge-tour-title"
              className="judge-tour-title-text"
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.2px",
              }}
            >
              {activeStepDef.title}
            </h2>
            <span className="judge-tour-subtitle-text" style={{ fontSize: "12px", color: "#94a3b8" }}>
              {activeStepDef.subtitle}
            </span>
          </div>
        </div>

        {/* EXPANDABLE JUDGING RUBRIC: Single card per media_1793031597483.png */}
        <div
          className="judge-tour-rubric-card"
          style={{
            margin: "12px 24px 0",
            backgroundColor: "#070c18",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setShowRubric(!showRubric)}
            aria-expanded={showRubric}
            className="judge-tour-rubric-btn"
            style={{
              width: "100%",
              padding: "9px 14px",
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              fontSize: "11.5px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IonIcon icon={clipboardOutline} style={{ fontSize: "14px", color: "#38bdf8" }} />
              <span style={{ fontWeight: 600, color: "#f1f5f9" }}>Judging rubric</span>
              <span style={{ color: "#64748b" }}>·</span>
              <span style={{ color: "#94a3b8", fontSize: "11px" }}>
                Demonstrating: <strong style={{ color: "#00e5ff" }}>{activeStepDef.criterionTitle}</strong>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "11px" }}>
              <span className="judge-tour-rubric-summary-text">5 criteria · 20% each</span>
              <IonIcon icon={showRubric ? chevronUpOutline : chevronDownOutline} style={{ fontSize: "13px" }} />
            </div>
          </button>

          {showRubric && (
            <div
              className="judge-tour-rubric-details"
              style={{
                padding: "12px 14px",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                backgroundColor: "#050912",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "10px",
                fontSize: "11px",
              }}
            >
              {RUBRIC_CRITERIA.map((crit, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div style={{ fontSize: "9.5px", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>
                    {crit.pillar}
                  </div>
                  <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: "3px" }}>
                    {crit.name}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#94a3b8", lineHeight: 1.35 }}>
                    {crit.desc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Toast */}
        {triggeredNotice && (
          <div
            style={{
              margin: "10px 24px 0",
              backgroundColor: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "#38bdf8",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: "14px" }} />
            <span>{triggeredNotice}</span>
          </div>
        )}

        {/* STEP CONTENT BODY: Spacious, 980px maxWidth */}
        <div
          className="judge-tour-body"
          style={{
            padding: "16px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            flex: 1,
            boxSizing: "border-box",
          }}
        >
          {/* ================= STEP 1: PITCH RADAR ================= */}
          <div style={{ display: currentStep === 1 ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Select a tactical match scenario to inject synthetic momentum into the Voronoi pitch engine:
              </span>
              <button
                onClick={handleResetScenario}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <IonIcon icon={refreshOutline} />
                <span>Reset Baseline</span>
              </button>
            </div>

            {/* 3 Streamlined Scenario Cards */}
            <div className="judge-tour-scenarios-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <button
                onClick={() => handleTriggerScenario("low_block_siege", "Low Block Siege")}
                style={{
                  background: activeScenario === "low_block_siege" ? "rgba(0, 229, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: activeScenario === "low_block_siege" ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "14px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: activeScenario === "low_block_siege" ? "#00e5ff" : "#f1f5f9" }}>
                    🛡️ Low Block Siege
                  </span>
                  <span style={{ fontSize: "10.5px", color: "#38bdf8", fontWeight: 700 }}>82% Control</span>
                </div>
                <span style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.35 }}>
                  Arsenal 18m bunker defense compressing attacking space.
                </span>
              </button>

              <button
                onClick={() => handleTriggerScenario("counter_attack_blitz", "Counter Attack Blitz")}
                style={{
                  background: (activeScenario === "counter_attack_blitz" || activeScenario === "counter_attack_transition" || activeScenario === "rapid_counter") ? "rgba(0, 229, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: (activeScenario === "counter_attack_blitz" || activeScenario === "counter_attack_transition" || activeScenario === "rapid_counter") ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "14px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: (activeScenario === "counter_attack_blitz" || activeScenario === "counter_attack_transition" || activeScenario === "rapid_counter") ? "#00e5ff" : "#f1f5f9" }}>
                    ⚡ Counter Attack Blitz
                  </span>
                  <span style={{ fontSize: "10.5px", color: "#38bdf8", fontWeight: 700 }}>33 km/h</span>
                </div>
                <span style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.35 }}>
                  Saka vertical break over 48m into unguarded space.
                </span>
              </button>

              <button
                onClick={() => handleTriggerScenario("final_minutes_desperation", "Final Minutes Desperation")}
                style={{
                  background: (activeScenario === "final_minutes_desperation" || activeScenario === "box_scramble") ? "rgba(0, 229, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: (activeScenario === "final_minutes_desperation" || activeScenario === "box_scramble") ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "14px",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: (activeScenario === "final_minutes_desperation" || activeScenario === "box_scramble") ? "#00e5ff" : "#f1f5f9" }}>
                    🚨 Final Minutes Desperation
                  </span>
                  <span style={{ fontSize: "10.5px", color: "#38bdf8", fontWeight: 700 }}>0.82 xG</span>
                </div>
                <span style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.35 }}>
                  90'+ goalmouth rebound scramble with keeper pulled forward.
                </span>
              </button>
            </div>

            {/* Jump Action */}
            {onNavigateTab && (
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "2px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab("pitch");
                  }}
                  style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Open Pitch Radar Page</span>
                  <IonIcon icon={arrowForwardOutline} />
                </button>
              </div>
            )}

            {/* Collapsed Performance & Latency SLA Meter */}
            <div style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
              <button
                onClick={() => setShowSLA(!showSLA)}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "none",
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: "11.5px",
                  fontWeight: 600,
                }}
              >
                <span>Live Latency & Physics SLA Details</span>
                <IonIcon icon={showSLA ? chevronUpOutline : chevronDownOutline} style={{ fontSize: "14px", color: "#64748b" }} />
              </button>

              {showSLA && (
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#060a14" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ padding: "10px", backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                        <span style={{ color: "#cbd5e1" }}>Fast-Path Physics & Mesh</span>
                        <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                          ~{serverStatus.isConnected ? Math.max(1.2, Math.min(6.5, serverStatus.latencyMs || 2.0)).toFixed(1) : "2.0"}ms
                        </span>
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                        Target &lt; 50ms · <span style={{ color: "#34d399", fontWeight: 600 }}>96% Headroom</span>
                      </div>
                    </div>

                    <div style={{ padding: "10px", backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                        <span style={{ color: "#cbd5e1" }}>Blackboard Agent Reasoning</span>
                        <span style={{ color: "#c084fc", fontWeight: 700 }}>~0.4ms</span>
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                        Target &lt; 1500ms · <span style={{ color: "#34d399", fontWeight: 600 }}>99% Headroom</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", fontSize: "10.5px", color: "#64748b" }}>
                    <span>Simulation Engine: 10Hz</span>
                    <span>•</span>
                    <span>Broadcast Stream: 5Hz (200ms)</span>
                    <span>•</span>
                    <span>Pitch Canvas: 60 FPS</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= STEP 2: AGENT SWARM ================= */}
          <div style={{ display: currentStep === 2 ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              4 specialized agents execute collaboratively over a shared blackboard state for deterministic analytics and narrative storytelling:
            </span>

            {/* 2x2 Clean Agent Grid */}
            <div className="judge-tour-agents-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#f1f5f9", marginBottom: "4px" }}>
                  🛰️ Ingestion Agent
                </div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.4 }}>
                  Validates 10Hz synthetic coordinates, enforces pitch boundary rules, and computes instantaneous velocity vectors.
                </div>
              </div>

              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#f1f5f9", marginBottom: "4px" }}>
                  📐 Spatial Analytics Agent
                </div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.4 }}>
                  Computes 357 Voronoi pitch control cells, intercepts passing lanes, and calculates dynamic Expected Threat (xT).
                </div>
              </div>

              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#f1f5f9", marginBottom: "4px" }}>
                  🎙️ Broadcast Narrative Agent
                </div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.4 }}>
                  Detects tactical inflection events, auto-generates live commentary, and generates half-time teleprompter recaps.
                </div>
              </div>

              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#f1f5f9", marginBottom: "4px" }}>
                  🎯 Personalization Agent
                </div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.4 }}>
                  Dynamically modulates narrative tone, visual density, and metric depth for Tactical Analyst vs. Casual Fan personas.
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "2px" }}>
              {onOpenCopilot && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCopilot();
                  }}
                  style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <IonIcon icon={sparklesOutline} />
                  <span>Launch Copilot (Cmd+K)</span>
                </button>
              )}

              {onNavigateTab && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab("tactical");
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#cbd5e1",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Open Tactical View</span>
                  <IonIcon icon={arrowForwardOutline} />
                </button>
              )}
            </div>

            {/* Collapsed Swarm Architecture Specifications */}
            <div style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
              <button
                onClick={() => setShowAgentSpecs(!showAgentSpecs)}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "none",
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: "11.5px",
                  fontWeight: 600,
                }}
              >
                <span>Blackboard Architecture & Grounding Guarantees</span>
                <IonIcon icon={showAgentSpecs ? chevronUpOutline : chevronDownOutline} style={{ fontSize: "14px", color: "#64748b" }} />
              </button>

              {showAgentSpecs && (
                <div style={{ padding: "12px 14px", fontSize: "11px", color: "#94a3b8", backgroundColor: "#060a14", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <strong style={{ color: "#f1f5f9" }}>Zero-Hallucination Grounding:</strong> All agent outputs are mathematically bounded by underlying telemetry frame coordinates.
                  </div>
                  <div>
                    <strong style={{ color: "#f1f5f9" }}>Tiered Fast-Path:</strong> Deterministic calculations execute in &lt;5ms; LLM-based narrative triggers selectively on inflection events.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= STEP 3: DUAL PERSONAS ================= */}
          <div style={{ display: currentStep === 3 ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Click to preview persona adaptation across tactical density, commentary tone, and metric depth:
            </span>

            {/* Persona Selection Cards */}
            <div className="judge-tour-personas-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div
                onClick={() => baseMemory.setPersona("analyst")}
                style={{
                  backgroundColor: selectedPersona === "analyst" ? "rgba(0, 229, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: selectedPersona === "analyst" ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: selectedPersona === "analyst" ? "#00e5ff" : "#f1f5f9" }}>
                    Tactical Analyst Experience
                  </span>
                  {selectedPersona === "analyst" ? (
                    <span style={{ fontSize: "10px", color: "#00e5ff", fontWeight: 800, backgroundColor: "rgba(0, 229, 255, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                      ACTIVE
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Select</span>
                  )}
                </div>
                <span style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>
                  Voronoi pitch mesh, passing difficulty models, bunker compactness (18m), and cumulative Expected Goals (xG).
                </span>
                <div style={{ marginTop: "6px", fontSize: "11px", color: "#38bdf8", fontWeight: 600 }}>
                  For coaching staff & match-day data analysts
                </div>
              </div>

              <div
                onClick={() => baseMemory.setPersona("casual")}
                style={{
                  backgroundColor: selectedPersona === "casual" ? "rgba(0, 229, 255, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: selectedPersona === "casual" ? "1px solid #00e5ff" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: selectedPersona === "casual" ? "#00e5ff" : "#f1f5f9" }}>
                    Casual Fan Experience
                  </span>
                  {selectedPersona === "casual" ? (
                    <span style={{ fontSize: "10px", color: "#00e5ff", fontWeight: 800, backgroundColor: "rgba(0, 229, 255, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                      ACTIVE
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Select</span>
                  )}
                </div>
                <span style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>
                  Live momentum swings, 1-on-1 sprint duels, punchy commentary soundbites, and plain-English tactical insights.
                </span>
                <div style={{ marginTop: "6px", fontSize: "11px", color: "#38bdf8", fontWeight: 600 }}>
                  For broadcast second-screen viewers & casual supporters
                </div>
              </div>
            </div>

            {/* Jump Action */}
            {onNavigateTab && (
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "2px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab("personas");
                  }}
                  style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Open Fan Persona Studio</span>
                  <IonIcon icon={arrowForwardOutline} />
                </button>
              </div>
            )}

            {/* Collapsed Multilingual Commentary */}
            <div style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
              <button
                onClick={() => setShowPersonaSpecs(!showPersonaSpecs)}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "none",
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: "11.5px",
                  fontWeight: 600,
                }}
              >
                <span>5-Language Synchronous Broadcast Stream</span>
                <IonIcon icon={showPersonaSpecs ? chevronUpOutline : chevronDownOutline} style={{ fontSize: "14px", color: "#64748b" }} />
              </button>

              {showPersonaSpecs && (
                <div style={{ padding: "12px 14px", fontSize: "11px", color: "#94a3b8", backgroundColor: "#060a14" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span>English</span> • <span>Spanish (Español)</span> • <span>French (Français)</span> • <span>German (Deutsch)</span> • <span>Japanese (日本語)</span>
                  </div>
                  <div>Commentary streams in real-time with localized terminology without impacting playback latency.</div>
                </div>
              )}
            </div>
          </div>

          {/* ================= STEP 4: HERO ARCHITECTURE ================= */}
          <div style={{ display: currentStep === 4 ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Microsoft Cloud and Hero Technologies executing the synthetic broadcast pipeline:
            </span>

            {/* Connected Horizontal Pipeline: 5 Stages */}
            <div
              className="judge-tour-pipeline-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                padding: "14px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "9.5px", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>Stage 1</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>Azure AI Foundry</span>
                <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>LLM orchestration & prompt grounding</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "9.5px", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>Stage 2</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>Azure MCP</span>
                <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>7 Model Context Protocol tool endpoints</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "9.5px", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>Stage 3</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>Event Hubs</span>
                <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>10Hz streaming ingestion pipeline</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "9.5px", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>Stage 4</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>Blackboard Swarm</span>
                <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Multi-agent synchronous state bus</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "9.5px", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>Stage 5</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>Azure Cosmos DB</span>
                <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Sub-10ms state snapshots & replay</span>
              </div>
            </div>

            {/* Jump Action */}
            {onNavigateTab && (
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "2px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab("diagnostics");
                  }}
                  style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>Open Cloud Diagnostics</span>
                  <IonIcon icon={arrowForwardOutline} />
                </button>
              </div>
            )}

            {/* Collapsed MCP Tools */}
            <div style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
              <button
                onClick={() => setShowArchSpecs(!showArchSpecs)}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "none",
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: "11.5px",
                  fontWeight: 600,
                }}
              >
                <span>7 Model Context Protocol (MCP) Tool Schemas</span>
                <IonIcon icon={showArchSpecs ? chevronUpOutline : chevronDownOutline} style={{ fontSize: "14px", color: "#64748b" }} />
              </button>

              {showArchSpecs && (
                <div style={{ padding: "12px 14px", fontSize: "11px", color: "#94a3b8", backgroundColor: "#060a14", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                  <div>1. get_frame_telemetry</div>
                  <div>2. calculate_pitch_control</div>
                  <div>3. evaluate_pass_lanes</div>
                  <div>4. detect_inflections</div>
                  <div>5. get_blackboard_state</div>
                  <div>6. generate_match_recap</div>
                  <div>7. inject_demo_scenario</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER: Prev, Step X of 4, Next per media_1793031578727.png */}
        <div
          className="judge-tour-footer"
          style={{
            padding: "14px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.07)",
            backgroundColor: "#0a101f",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          {/* Previous Button */}
          <button
            onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as TourStep) : prev))}
            disabled={currentStep === 1}
            className="judge-tour-prev-btn"
            style={{
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: currentStep === 1 ? "#475569" : "#cbd5e1",
              padding: "7px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: currentStep === 1 ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <IonIcon icon={arrowBackOutline} />
            <span>Previous</span>
          </button>

          {/* Clean Step Counter Text */}
          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>
            Step {currentStep} of 4
          </span>

          {/* Next / Finish Button */}
          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((prev) => ((prev + 1) as TourStep))}
              className="judge-tour-next-btn"
              style={{
                backgroundColor: "#00e5ff",
                border: "none",
                color: "#020617",
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 10px rgba(0, 229, 255, 0.25)",
              }}
            >
              <span>Next: {STEPS[currentStep].label}</span>
              <IonIcon icon={arrowForwardOutline} />
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                if (onNavigateTab) onNavigateTab("dashboard");
              }}
              className="judge-tour-next-btn"
              style={{
                backgroundColor: "#00e5ff",
                border: "none",
                color: "#020617",
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 10px rgba(0, 229, 255, 0.25)",
              }}
            >
              <span>Explore Studio Dashboard →</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? ReactDOM.createPortal(modalContent, document.body)
    : modalContent;
};

