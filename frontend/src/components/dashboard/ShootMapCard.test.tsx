import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ShootMapCard } from "./ShootMapCard";
import { baseMemory } from "../../store/baseMemory";

describe("ShootMapCard Interactivity & Team Filtering", () => {
  beforeEach(() => {
    act(() => {
      baseMemory.setSelectedPlayer(null);
      baseMemory.setMatchClock(5400); // Set clock to 90' so all shots have elapsed for interactive tests
    });
  });

  it("renders default Shoot Map for Man City with shots and allows selecting Haaland goal", () => {
    render(<ShootMapCard />);
    expect(screen.getByText("Shoot Map")).toBeDefined();
    expect(screen.getByText("Man City")).toBeDefined();
    expect(screen.getByText("Arsenal")).toBeDefined();
    
    // Check Haaland goal shot exists and click it
    const haalandDot = screen.getByTitle(/E\. Haaland \(42'\) - GOAL/);
    expect(haalandDot).toBeDefined();
    fireEvent.click(haalandDot);

    expect(screen.getByText(/E\. Haaland 42'/)).toBeDefined();
    expect(screen.getByText("0.74")).toBeDefined();
    expect(screen.getByText("GOAL")).toBeDefined();
  });

  it("displays empty state when match clock is before any shots have occurred", () => {
    act(() => {
      baseMemory.setMatchClock(600); // 10'
    });
    render(<ShootMapCard />);
    expect(screen.getByText(/No City shots logged yet/)).toBeDefined();
  });

  it("switches to Arsenal shot distribution when Arsenal button is clicked", () => {
    render(<ShootMapCard />);
    const arsenalBtn = screen.getByText("Arsenal");
    fireEvent.click(arsenalBtn);

    // Arsenal default shot is B. Saka 84' Goal
    expect(screen.getByText(/B\. Saka 84'/)).toBeDefined();
    expect(screen.getByText("0.72")).toBeDefined();
    expect(screen.getByText("GOAL")).toBeDefined();
  });

  it("updates shot details and focuses player when a shot dot is clicked", () => {
    render(<ShootMapCard />);
    // Select De Bruyne shot dot
    const deBruyneDot = screen.getByTitle(/K\. De Bruyne \(69'\)/);
    expect(deBruyneDot).toBeDefined();

    fireEvent.click(deBruyneDot);

    expect(screen.getByText(/K\. De Bruyne 69'/)).toBeDefined();
    expect(screen.getByText("0.22")).toBeDefined();
    expect(screen.getByText("SAVED")).toBeDefined();
    expect(baseMemory.getState().selectedPlayerId).toBe("home_7");
  });

  it("synchronizes with external selectedPlayerId from baseMemory", () => {
    render(<ShootMapCard />);
    act(() => {
      baseMemory.setSelectedPlayer("home_11"); // Grealish
    });

    expect(screen.getByText(/J\. Grealish 76'/)).toBeDefined();
    expect(screen.getByText("0.24")).toBeDefined();
    expect(screen.getByText("SAVED")).toBeDefined();
  });
});

