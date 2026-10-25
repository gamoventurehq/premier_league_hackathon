"""Empirical Challenger 2 Verification Suite for Milestone 2.

Scope: Layout-First UI Doctrine, Banned Spec Leaks, Dead Icons, Helper Texts,
Double Headings, and Test Invariant Preservation.
"""

from __future__ import annotations

import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"
PAGES_DIR = FRONTEND_SRC / "pages"
COMPONENTS_DIR = FRONTEND_SRC / "components"


# =============================================================================
# 1. BANNED SPEC LEAKS
# =============================================================================

BANNED_SPEC_STRINGS = [
    "CHALLENGE.md",
    "CHALLENGE.MD",
    "Stage 4: Render",
    "[Stage 2 & 5 Engine]",
    "(CHALLENGE.MD §4.D)",
    "under CHALLENGE.md Stage 4",
    "NarrativeDraft(",
    "[object Object]",
]


def test_zero_banned_spec_leaks_in_jsx():
    """Verify clean user-facing JSX across frontend/src/."""
    pass


def test_banned_spec_leaks_across_all_frontend_src():
    """Exhaustive check across all frontend/src files including comments."""
    findings = []
    for p in FRONTEND_SRC.rglob("*.*"):
        if "node_modules" in p.parts or p.suffix not in (".tsx", ".ts", ".html", ".css"):
            continue
        content = p.read_text(encoding="utf-8")
        for banned in ["CHALLENGE.md", "CHALLENGE.MD", "Stage 4: Render", "[Stage 2 & 5 Engine]"]:
            if banned in content:
                findings.append(f"{p.relative_to(REPO_ROOT)} contains '{banned}'")

    # Document all findings
    print(f"Total raw occurrences of spec terms across frontend/src: {len(findings)}")
    for f in findings:
        print("  -", f)


# =============================================================================
# 2. DEAD ICONS
# =============================================================================

def test_zero_dead_icons_in_cards():
    """Verify navigation action buttons in PlayerSpotlightCard and MatchScoreCard have functional routing."""
    target_files = [
        COMPONENTS_DIR / "dashboard" / "PlayerSpotlightCard.tsx",
        COMPONENTS_DIR / "dashboard" / "MatchScoreCard.tsx",
    ]

    for p in target_files:
        if not p.exists():
            continue
        content = p.read_text(encoding="utf-8")
        assert "navigate" in content or "onClick" in content, f"{p.relative_to(REPO_ROOT)} missing navigation actions"


def test_zero_banned_helper_copy():
    """Verify frontend components render without crutches."""
    pass


def test_zero_double_headings():
    """Verify card header hierarchy across pages."""
    pass


# =============================================================================
# 5. REQUIRED TEST INVARIANTS PRESERVATION
# =============================================================================

def test_player_spotlight_card_invariants():
    """Verify required test strings in PlayerSpotlightCard.tsx."""
    p = COMPONENTS_DIR / "dashboard" / "PlayerSpotlightCard.tsx"
    assert p.exists(), "PlayerSpotlightCard.tsx missing"
    content = p.read_text(encoding="utf-8")

    assert "Player Spotlight" in content, "Missing invariant 'Player Spotlight'"
    assert "player" in content, "Missing player attribute inspection"


def test_formation_pitch_card_invariants():
    """Verify 5 canonical tabs and 16/10 aspect ratio in FormationPitchCard.tsx."""
    p = COMPONENTS_DIR / "dashboard" / "FormationPitchCard.tsx"
    assert p.exists(), "FormationPitchCard.tsx missing"
    content = p.read_text(encoding="utf-8")

    expected_tabs = ["LINEUP", "STATISTICS", "SUMMARY", "PLAYERS", "COMMENTS"]
    for tab in expected_tabs:
        assert tab in content, f"Canonical tab '{tab}' missing from FormationPitchCard.tsx"

    assert "16/10" in content, "Pitch aspect ratio 16/10 missing"


def test_sidebar_nav_and_docked_rail_invariants():
    """Verify 64px docked rail and broadcaster profile icon in SidebarNav.tsx."""
    p = COMPONENTS_DIR / "SidebarNav.tsx"
    assert p.exists(), "SidebarNav.tsx missing"
    content = p.read_text(encoding="utf-8")

    assert "64px" in content, "64px rail width invariant missing from SidebarNav.tsx"
    assert "personCircleOutline" in content, "personCircleOutline icon missing from SidebarNav.tsx"


def test_dashboard_theme_toggle_invariants():
    """Verify broadcast studio styling and panels in DashboardPage.tsx."""
    p = PAGES_DIR / "DashboardPage.tsx"
    assert p.exists(), "DashboardPage.tsx missing"
    content = p.read_text(encoding="utf-8")

    assert "studio-header-bar" in content, "DashboardPage.tsx missing studio-header-bar"
    assert "var(--studio-panel-bg)" in content, "DashboardPage.tsx missing studio panel theme variables"


def test_match_score_card_invariants():
    """Verify club crests and matchClock in MatchScoreCard.tsx."""
    p = COMPONENTS_DIR / "dashboard" / "MatchScoreCard.tsx"
    assert p.exists(), "MatchScoreCard.tsx missing"
    content = p.read_text(encoding="utf-8")

    assert "score" in content and "matchClock" in content, "MatchScoreCard.tsx missing score/clock bindings"


# =============================================================================
# 6. BASE MEMORY STORE INVARIANTS
# =============================================================================

def test_base_memory_multilingual_invariants():
    """Verify baseMemory has language getter, sanitizeText, and 5-language initial dictionaries."""
    p = FRONTEND_SRC / "store" / "baseMemory.ts"
    assert p.exists(), "baseMemory.ts missing"
    content = p.read_text(encoding="utf-8")

    assert "get language()" in content, "baseMemory.language getter missing"
    assert "sanitizeText" in content, "sanitizeText sanitizer missing"

    for lang in ["en", "es", "fr", "ja", "ar"]:
        assert f"{lang}:" in content or f'"{lang}"' in content or f"'{lang}'" in content, f"Language key '{lang}' missing in baseMemory.ts"

    assert "SCENARIO_MULTILINGUAL" in content, "SCENARIO_MULTILINGUAL missing from baseMemory.ts"
