import React from "react";
import { baseMemory } from "../store/baseMemory";

interface JudgeQuickTourPillProps {
  compact?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const JudgeQuickTourPill: React.FC<JudgeQuickTourPillProps> = ({
  compact = false,
  onClick,
  style,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      baseMemory.openJudgeTour();
    }
  };

  return (
    <button
      onClick={handleClick}
      title="Open Judge Tour & Hero Tech Architecture Modal [Cmd+J / Ctrl+J]"
      aria-label="Judge Tour: 2 minute walkthrough"
      className="judge-quick-tour-pill"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? "4px" : "6px",
        background: "#00e5ff",
        border: "none",
        borderRadius: "8px",
        padding: compact ? "5px 10px" : "6px 14px",
        color: "#020617",
        fontSize: compact ? "11px" : "12px",
        fontWeight: 800,
        letterSpacing: "0.2px",
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(0, 229, 255, 0.25)",
        whiteSpace: "nowrap",
        userSelect: "none",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#38bdf8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#00e5ff";
      }}
    >
      <span className="judge-pill-text">
        {compact ? "Judge tour · 2 min" : "Judge tour · 2 min"}
      </span>
    </button>
  );
};
