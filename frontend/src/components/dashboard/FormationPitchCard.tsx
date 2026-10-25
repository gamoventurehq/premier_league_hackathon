import React, { useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  personOutline,
  flashOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";

const homeLineup = [
  { id: "home_1", number: 31, name: "Ederson", pos: "GK", rating: 6.8, x: 8, y: 50 },
  { id: "home_2", number: 2, name: "K. Walker", pos: "RB", rating: 7.1, x: 22, y: 18 },
  { id: "home_3", number: 3, name: "R. Dias", pos: "CB", rating: 7.4, x: 20, y: 38 },
  { id: "home_4", number: 25, name: "M. Akanji", pos: "CB", rating: 7.0, x: 20, y: 62 },
  { id: "home_5", number: 24, name: "J. Gvardiol", pos: "LB", rating: 7.2, x: 22, y: 82 },
  { id: "home_6", number: 16, name: "Rodri", pos: "DM", rating: 8.3, x: 36, y: 50 },
  { id: "home_7", number: 17, name: "K. De Bruyne", pos: "CM", rating: 8.8, x: 42, y: 28 },
  { id: "home_8", number: 20, name: "B. Silva", pos: "CM", rating: 7.9, x: 42, y: 72 },
  { id: "home_9", number: 47, name: "P. Foden", pos: "RW", rating: 8.2, x: 48, y: 15 },
  { id: "home_10", number: 9, name: "E. Haaland", pos: "ST", rating: 8.5, x: 45, y: 44 },
  { id: "home_11", number: 10, name: "J. Grealish", pos: "LW", rating: 7.5, x: 48, y: 85 },
];

const awayLineup = [
  { id: "away_1", number: 22, name: "D. Raya", pos: "GK", rating: 6.9, x: 92, y: 50 },
  { id: "away_2", number: 4, name: "B. White", pos: "RB", rating: 6.8, x: 78, y: 82 },
  { id: "away_3", number: 2, name: "W. Saliba", pos: "CB", rating: 7.3, x: 80, y: 62 },
  { id: "away_4", number: 6, name: "Gabriel", pos: "CB", rating: 7.2, x: 80, y: 38 },
  { id: "away_5", number: 12, name: "J. Timber", pos: "LB", rating: 6.9, x: 78, y: 18 },
  { id: "away_6", number: 5, name: "T. Partey", pos: "DM", rating: 7.0, x: 68, y: 65 },
  { id: "away_7", number: 41, name: "D. Rice", pos: "DM", rating: 7.6, x: 68, y: 35 },
  { id: "away_8", number: 7, name: "B. Saka", pos: "RW", rating: 8.0, x: 58, y: 85 },
  { id: "away_9", number: 8, name: "M. Ødegaard", pos: "AM", rating: 7.7, x: 63, y: 50 },
  { id: "away_10", number: 11, name: "G. Martinelli", pos: "LW", rating: 7.2, x: 58, y: 15 },
  { id: "away_11", number: 29, name: "K. Havertz", pos: "ST", rating: 7.1, x: 55, y: 56 },
];

export const FormationPitchCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("LINEUP");
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);

  return (
    <div
      style={{
        backgroundColor: "var(--studio-panel-bg)",
        border: "1px solid var(--studio-panel-border)",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          borderBottom: "1px solid var(--studio-panel-border)",
        }}
      >
        {["SUMMARY", "STATISTICS", "LINEUP", "PLAYERS", "COMMENTS"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === tab ? "rgba(16, 185, 129, 0.2)" : "transparent",
              color: activeTab === tab ? "#10b981" : "var(--studio-subtext)",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.5px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: Tactical Lineup & Pitch */}
      {activeTab === "LINEUP" && (
        <>
          {/* Formation Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 8px",
          fontSize: "12px",
          fontWeight: 800,
          color: "var(--ion-text-color)",
        }}
      >
        <span style={{ color: "#00e5ff" }}>4 - 3 - 3</span>
        <span style={{ color: "#f43f5e" }}>4 - 2 - 3 - 1</span>
      </div>

      {/* Tactical Lineup Pitch */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16/10",
          backgroundColor: "#166534",
          backgroundImage:
            "radial-gradient(ellipse at center, #15803d 0%, #14532d 100%)",
          borderRadius: "12px",
          position: "relative",
          overflow: "hidden",
          border: "2px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "inset 0 0 40px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Pitch Lines */}
        <div
          style={{
            position: "absolute",
            inset: "8px",
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
            pointerEvents: "none",
          }}
        />
        {/* Halfway Line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "8px",
            bottom: "8px",
            width: "1.5px",
            backgroundColor: "rgba(255, 255, 255, 0.35)",
            pointerEvents: "none",
          }}
        />
        {/* Center Circle */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
            pointerEvents: "none",
          }}
        />

        {/* Home Players */}
        {homeLineup.map((p) => {
          const isSelected = selectedPlayerId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => baseMemory.setSelectedPlayer(p.id)}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                zIndex: isSelected ? 10 : 2,
              }}
            >
              {/* Player Dot */}
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#00e5ff",
                  border: isSelected ? "2.5px solid #ffd600" : "1.5px solid #ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: 900,
                  color: "#080d16",
                  boxShadow: isSelected
                    ? "0 0 10px #ffd600"
                    : "0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {p.number}
              </div>
              {/* Name & Rating */}
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  color: "#ffffff",
                  textShadow: "0 1px 2px #000000",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 800,
                  backgroundColor: p.rating >= 8.0 ? "#10b981" : "#f59e0b",
                  color: "#ffffff",
                  padding: "0 3px",
                  borderRadius: "3px",
                  marginTop: "1px",
                }}
              >
                {p.rating}
              </span>
            </div>
          );
        })}

        {/* Away Players */}
        {awayLineup.map((p) => {
          const isSelected = selectedPlayerId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => baseMemory.setSelectedPlayer(p.id)}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                zIndex: isSelected ? 10 : 2,
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#f43f5e",
                  border: isSelected ? "2.5px solid #ffd600" : "1.5px solid #ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: 900,
                  color: "#ffffff",
                  boxShadow: isSelected
                    ? "0 0 10px #ffd600"
                    : "0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {p.number}
              </div>
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  color: "#ffffff",
                  textShadow: "0 1px 2px #000000",
                  marginTop: "2px",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 800,
                  backgroundColor: p.rating >= 8.0 ? "#10b981" : "#f59e0b",
                  color: "#ffffff",
                  padding: "0 3px",
                  borderRadius: "3px",
                  marginTop: "1px",
                }}
              >
                {p.rating}
              </span>
            </div>
          );
        })}
      </div>

      {/* Head Coach / Managers Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          paddingTop: "6px",
          borderTop: "1px solid var(--studio-panel-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 229, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00e5ff",
            }}
          >
            <IonIcon icon={personOutline} style={{ fontSize: "16px" }} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)" }}>
              Pep Guardiola
            </div>
            <div style={{ fontSize: "10px", color: "var(--studio-subtext)" }}>
              Head Coach
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)" }}>
              Mikel Arteta
            </div>
            <div style={{ fontSize: "10px", color: "var(--studio-subtext)" }}>
              Head Coach
            </div>
          </div>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f43f5e",
            }}
          >
            <IonIcon icon={personOutline} style={{ fontSize: "16px" }} />
          </div>
        </div>
      </div>
        </>
      )}

      {/* Tab 2: Head-to-Head Match Statistics */}
      {activeTab === "STATISTICS" && (
        <div
          style={{
            minHeight: "470px",
            maxHeight: "470px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "8px 4px",
          }}
        >
          {/* Header Legend */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#00e5ff" }}>Manchester City</span>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#f43f5e" }}>Arsenal</span>
          </div>

          {[
            { label: "Possession", home: "58%", away: "42%", homePct: 58 },
            { label: "Expected Goals (xG)", home: "2.45", away: "1.12", homePct: 68 },
            { label: "Total Shots", home: "14", away: "8", homePct: 63 },
            { label: "Shots on Target", home: "6", away: "3", homePct: 66 },
            { label: "Pitch Control", home: "61%", away: "39%", homePct: 61 },
            { label: "Control vs. Chaos Index", home: "74%", away: "52%", homePct: 58 },
            { label: "Pass Difficulty Rating", home: "86%", away: "79%", homePct: 52 },
            { label: "Corner Kicks", home: "5", away: "2", homePct: 71 },
            { label: "Fouls", home: "7", away: "11", homePct: 39 },
            { label: "Yellow Cards", home: "1", away: "2", homePct: 33 },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "var(--studio-inner-bg)",
                borderRadius: "10px",
                padding: "8px 12px",
                border: "1px solid var(--studio-panel-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                <span style={{ color: "#00e5ff" }}>{stat.home}</span>
                <span style={{ color: "var(--ion-text-color)" }}>{stat.label}</span>
                <span style={{ color: "#f43f5e" }}>{stat.away}</span>
              </div>
              {/* Dual Proportional Bar */}
              <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div style={{ width: `${stat.homePct}%`, backgroundColor: "#00e5ff" }} />
                <div style={{ width: `${100 - stat.homePct}%`, backgroundColor: "#f43f5e" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: AI Tactical Narrative Summary */}
      {activeTab === "SUMMARY" && (
        <div
          style={{
            minHeight: "470px",
            maxHeight: "470px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "8px 4px",
          }}
        >
          {/* AI Narrative Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(0, 229, 255, 0.1))",
              border: "1px solid rgba(124, 58, 237, 0.3)",
            }}
          >
            <IonIcon icon={flashOutline} style={{ color: "#00e5ff", fontSize: "18px" }} />
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--ion-text-color)" }}>
                Tactical Inflection Engine • Live Narrative
              </div>
            </div>
          </div>

          {/* Match Story Card */}
          <div
            style={{
              backgroundColor: "var(--studio-inner-bg)",
              borderRadius: "10px",
              padding: "12px",
              border: "1px solid var(--studio-panel-border)",
              fontSize: "12px",
              lineHeight: "1.5",
              color: "var(--ion-text-color)",
            }}
          >
            <span style={{ fontWeight: 800, color: "#10b981", display: "block", marginBottom: "4px" }}>
              Dominant Half-Space Overloads
            </span>
            Manchester City sustained 61% Pitch Control by pinning Arsenal's defensive line with Erling Haaland while Kevin De Bruyne and Rodri operated between the lines. Arsenal responded with dangerous fast-break transitions down the right flank spearheaded by Bukayo Saka.
          </div>

          {/* Tactical Inflection Points List */}
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--studio-subtext)", textTransform: "uppercase" }}>
            Tactical Inflection Points
          </span>

          {[
            {
              time: "42'",
              title: "Low-Block Breakthrough",
              detail: "Haaland finished from 11m following a 14-pass sequence. Shot xG: 0.74, Pass Difficulty: 88%.",
              impact: "Home Momentum +28%",
            },
            {
              time: "69'",
              title: "Flank Overload Adjustment",
              detail: "Guardiola introduced Grealish to stretch Arsenal's 4-2-3-1, creating space for De Bruyne's curling strike.",
              impact: "Control Index 74%",
            },
            {
              time: "84'",
              title: "Rapid Counter-Transition",
              detail: "Saka broke City's rest-defense in 4 touches, punishing high line positioning with an equalizer.",
              impact: "Game Rhythm Shift",
            },
          ].map((inflection) => (
            <div
              key={inflection.time}
              style={{
                backgroundColor: "var(--studio-inner-bg)",
                borderRadius: "10px",
                padding: "10px 12px",
                border: "1px solid var(--studio-panel-border)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 900, color: "#7c3aed", fontFamily: "monospace" }}>
                    {inflection.time}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)" }}>
                    {inflection.title}
                  </span>
                </div>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                  {inflection.impact}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--studio-subtext)", lineHeight: "1.4" }}>
                {inflection.detail}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Interactive Player Roster Ratings */}
      {activeTab === "PLAYERS" && (
        <div
          style={{
            minHeight: "470px",
            maxHeight: "470px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "8px 4px",
          }}
        >
          {[...homeLineup.map((p) => ({ ...p, team: "MCI", color: "#00e5ff" })), ...awayLineup.map((p) => ({ ...p, team: "ARS", color: "#f43f5e" }))].map((p) => {
            const isSelected = selectedPlayerId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => baseMemory.setSelectedPlayer(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  backgroundColor: isSelected ? "rgba(124, 58, 237, 0.2)" : "var(--studio-inner-bg)",
                  borderRadius: "8px",
                  border: isSelected ? "1.5px solid #7c3aed" : "1px solid var(--studio-panel-border)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 900, color: p.color, minWidth: "28px" }}>
                    {p.team}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--studio-subtext)", minWidth: "18px" }}>
                    #{p.number}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)" }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.08)", color: "var(--studio-subtext)" }}>
                    {p.pos}
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: p.rating >= 8.0 ? "#10b981" : p.rating >= 7.3 ? "#3b82f6" : "#f59e0b",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 900,
                    padding: "2px 7px",
                    borderRadius: "4px",
                  }}
                >
                  {p.rating}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 5: Broadcast Multi-Agent Commentary */}
      {activeTab === "COMMENTS" && (
        <div
          style={{
            minHeight: "470px",
            maxHeight: "470px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "8px 4px",
          }}
        >
          {[
            { time: "88'", agent: "Tactical Agent", role: "Shape Analyst", text: "Arsenal shifted into a narrow 4-4-2 block to restrict central progression, forcing City wide." },
            { time: "84'", agent: "Narrative Agent", role: "Story Synthesizer", text: "Saka's clinical counter-attack punctures City's momentum and restores emotional equilibrium." },
            { time: "69'", agent: "Telemetry Agent", role: "Spatial Tracking", text: "Centroid compression detected: City squeezed Arsenal's defensive line within 18 meters." },
            { time: "42'", agent: "Personalization Agent", role: "Casual Focus", text: "Haaland's lethal instinct on display! 10th Premier League goal of the campaign in emphatic fashion." },
          ].map((comment, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "var(--studio-inner-bg)",
                borderRadius: "10px",
                padding: "10px 12px",
                border: "1px solid var(--studio-panel-border)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 900, color: "#00e5ff", fontFamily: "monospace" }}>
                    {comment.time}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--ion-text-color)" }}>
                    {comment.agent}
                  </span>
                </div>
                <span style={{ fontSize: "9px", color: "var(--studio-subtext)" }}>
                  {comment.role}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--studio-subtext)", lineHeight: "1.4" }}>
                {comment.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
