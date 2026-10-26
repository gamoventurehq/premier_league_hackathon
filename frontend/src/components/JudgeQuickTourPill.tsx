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
      title="Open Judge Quick Tour & Hero Tech Architecture Modal [Cmd+J / Ctrl+J]"
      aria-label="Judge Quick Tour and Hero Tech Stack"
      className="judge-quick-tour-pill"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? "6px" : "8px",
        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%)",
        border: "1px solid rgba(245, 158, 11, 0.75)",
        borderRadius: "9999px",
        padding: compact ? "4px 10px" : "6px 14px",
        color: "#fef08a",
        fontSize: compact ? "11px" : "12px",
        fontWeight: 800,
        letterSpacing: "0.2px",
        cursor: "pointer",
        boxShadow: "0 0 18px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        whiteSpace: "nowrap",
        userSelect: "none",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
        e.currentTarget.style.boxShadow = "0 0 24px rgba(245, 158, 11, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)";
        e.currentTarget.style.borderColor = "rgba(251, 191, 36, 1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "0 0 18px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
        e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.75)";
      }}
    >
      {/* Trophy & Pulsing Badge */}
      <span style={{ fontSize: compact ? "13px" : "14px", lineHeight: 1 }}>🏆</span>

      {/* Label */}
      <span>
        {compact ? "Judge Tour" : "Judge Quick Tour • Hero Tech Stack"}
      </span>

      {/* Keyboard shortcut hint / 2-Min badge */}
      {!compact && (
        <span
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(245, 158, 11, 0.5)",
            borderRadius: "6px",
            padding: "1px 5px",
            fontSize: "9px",
            fontWeight: 900,
            color: "#fbbf24",
            letterSpacing: "0.5px",
            marginLeft: "2px",
          }}
        >
          2-MIN
        </span>
      )}
    </button>
  );
};
