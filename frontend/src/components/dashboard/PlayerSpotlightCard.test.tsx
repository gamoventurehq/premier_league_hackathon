import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PlayerSpotlightCard } from "./PlayerSpotlightCard";
import { baseMemory } from "../../store/baseMemory";

describe("PlayerSpotlightCard Dynamic Lookup", () => {
  beforeEach(() => {
    act(() => {
      baseMemory.setSelectedPlayer(null);
    });
  });

  it("renders default Player of the Match (K. De Bruyne) when no player is selected", () => {
    render(<PlayerSpotlightCard />);
    expect(screen.getByText("Player of the Match")).toBeDefined();
    expect(screen.getByText("K. De Bruyne")).toBeDefined();
    expect(screen.getByText("Manchester City • #17")).toBeDefined();
    expect(screen.getByText("8.8")).toBeDefined();
  });

  it("dynamically updates spotlight to Erling Haaland when home_10 is selected", () => {
    act(() => {
      baseMemory.setSelectedPlayer("home_10");
    });
    render(<PlayerSpotlightCard />);
    expect(screen.getByText("Player Spotlight")).toBeDefined();
    expect(screen.getByText("E. Haaland")).toBeDefined();
    expect(screen.getByText("Manchester City • #9")).toBeDefined();
    expect(screen.getByText("8.5")).toBeDefined();
  });

  it("dynamically updates spotlight to Bukayo Saka when away_8 is selected", () => {
    act(() => {
      baseMemory.setSelectedPlayer("away_8");
    });
    render(<PlayerSpotlightCard />);
    expect(screen.getByText("Player Spotlight")).toBeDefined();
    expect(screen.getByText("B. Saka")).toBeDefined();
    expect(screen.getByText("Arsenal • #7")).toBeDefined();
    expect(screen.getByText("8.0")).toBeDefined();
  });

  it("dynamically updates spotlight to Declan Rice when away_7 is selected", () => {
    act(() => {
      baseMemory.setSelectedPlayer("away_7");
    });
    render(<PlayerSpotlightCard />);
    expect(screen.getByText("Player Spotlight")).toBeDefined();
    expect(screen.getByText("D. Rice")).toBeDefined();
    expect(screen.getByText("Arsenal • #41")).toBeDefined();
    expect(screen.getByText("7.6")).toBeDefined();
  });

  it("dynamically updates spotlight to Kai Havertz when away_11 is selected", () => {
    act(() => {
      baseMemory.setSelectedPlayer("away_11");
    });
    render(<PlayerSpotlightCard />);
    expect(screen.getByText("Player Spotlight")).toBeDefined();
    expect(screen.getByText("K. Havertz")).toBeDefined();
    expect(screen.getByText("Arsenal • #29")).toBeDefined();
    expect(screen.getByText("7.1")).toBeDefined();
  });

  it("dynamically updates spotlight to Phil Foden when home_9 is selected", () => {
    act(() => {
      baseMemory.setSelectedPlayer("home_9");
    });
    render(<PlayerSpotlightCard />);
    expect(screen.getByText("Player Spotlight")).toBeDefined();
    expect(screen.getByText("P. Foden")).toBeDefined();
    expect(screen.getByText("Manchester City • #47")).toBeDefined();
    expect(screen.getByText("8.2")).toBeDefined();
  });

  it("correctly renders each of the 22 player selections with expected club and shirt numbers", () => {
    const playersToTest = [
      { id: "home_1", name: "Ederson", club: "Manchester City", num: 31 },
      { id: "home_2", name: "K. Walker", club: "Manchester City", num: 2 },
      { id: "home_3", name: "R. Dias", club: "Manchester City", num: 3 },
      { id: "home_4", name: "M. Akanji", club: "Manchester City", num: 25 },
      { id: "home_5", name: "J. Gvardiol", club: "Manchester City", num: 24 },
      { id: "home_6", name: "Rodri", club: "Manchester City", num: 16 },
      { id: "home_7", name: "K. De Bruyne", club: "Manchester City", num: 17 },
      { id: "home_8", name: "B. Silva", club: "Manchester City", num: 20 },
      { id: "home_9", name: "P. Foden", club: "Manchester City", num: 47 },
      { id: "home_10", name: "E. Haaland", club: "Manchester City", num: 9 },
      { id: "home_11", name: "J. Grealish", club: "Manchester City", num: 10 },
      { id: "away_1", name: "D. Raya", club: "Arsenal", num: 22 },
      { id: "away_2", name: "B. White", club: "Arsenal", num: 4 },
      { id: "away_3", name: "W. Saliba", club: "Arsenal", num: 2 },
      { id: "away_4", name: "Gabriel", club: "Arsenal", num: 6 },
      { id: "away_5", name: "J. Timber", club: "Arsenal", num: 12 },
      { id: "away_6", name: "T. Partey", club: "Arsenal", num: 5 },
      { id: "away_7", name: "D. Rice", club: "Arsenal", num: 41 },
      { id: "away_8", name: "B. Saka", club: "Arsenal", num: 7 },
      { id: "away_9", name: "M. Ødegaard", club: "Arsenal", num: 8 },
      { id: "away_10", name: "G. Martinelli", club: "Arsenal", num: 11 },
      { id: "away_11", name: "K. Havertz", club: "Arsenal", num: 29 },
    ];

    for (const p of playersToTest) {
      act(() => {
        baseMemory.setSelectedPlayer(p.id);
      });
      const { unmount } = render(<PlayerSpotlightCard />);
      expect(screen.getByText(p.name)).toBeDefined();
      expect(screen.getByText(`${p.club} • #${p.num}`)).toBeDefined();
      unmount();
    }
  });
});
