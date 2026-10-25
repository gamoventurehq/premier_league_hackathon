import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AttackingShapeCard } from "./AttackingShapeCard";
import { baseMemory } from "../../store/baseMemory";

describe("AttackingShapeCard Real-time Dynamics & Arsenal Support", () => {
  beforeEach(() => {
    act(() => {
      baseMemory.setSelectedPlayer(null);
      baseMemory.setMatchClock(1200);
    });
  });

  it("renders City attacking shape with LIVE 5Hz indicator and tactical dimensions", () => {
    render(<AttackingShapeCard />);
    expect(screen.getByText("Attacking Shape")).toBeDefined();
    expect(screen.getByText("LIVE 5Hz")).toBeDefined();
    expect(screen.getByText("Man City")).toBeDefined();
    expect(screen.getByText("Arsenal")).toBeDefined();
    expect(screen.getByText(/Width:/)).toBeDefined();
    expect(screen.getByText(/Depth:/)).toBeDefined();

    // Outfield players should include Haaland (9)
    expect(screen.getByTitle(/Haaland #9/)).toBeDefined();
  });

  it("toggles to Arsenal and renders Arsenal outfield squad nodes", () => {
    render(<AttackingShapeCard />);
    const arsenalBtn = screen.getByText("Arsenal");
    fireEvent.click(arsenalBtn);

    // Should render Saka #7 and Havertz #29
    expect(screen.getByTitle(/Saka #7/)).toBeDefined();
    expect(screen.getByTitle(/Havertz #29/)).toBeDefined();
  });

  it("spotlights player in baseMemory when node is clicked", () => {
    render(<AttackingShapeCard />);
    const haalandNode = screen.getByTitle(/Haaland #9/);
    fireEvent.click(haalandNode);

    expect(baseMemory.getState().selectedPlayerId).toBe("home_10");
  });
});
