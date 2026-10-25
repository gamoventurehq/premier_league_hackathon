"""UIStaticInspector: Inspects frontend layout, Cupertino configuration, theme variables, and UI doctrine."""

from __future__ import annotations

import re
from pathlib import Path

LEGACY_NEXT_INDICATORS = [
    "next.config.ts",
    "next.config.js",
    "next-env.d.ts",
    "postcss.config.mjs",
    "postcss.config.js",
    ".next",
    "src/app/layout.tsx",
    "src/app/page.tsx",
]

VITE_IONIC_REQUIRED_FILES = [
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "index.html",
    "src/main.tsx",
    "src/App.tsx",
    "src/theme/variables.css",
    "src/components/SidebarNav.tsx",
    "src/components/PitchRadarCanvas.tsx",
    "src/components/dashboard/MatchScoreCard.tsx",
    "src/components/dashboard/FormationPitchCard.tsx",
    "src/components/dashboard/PlayerSpotlightCard.tsx",
    "src/components/dashboard/ShootMapCard.tsx",
    "src/components/dashboard/AttackingShapeCard.tsx",
    "src/components/dashboard/MediaTimelinePanel.tsx",
]

BANNED_HELPER_TEXTS = [
    "Click or scrub along the tracks to jump match time",
    "Click Player to Spotlight in Right Column",
    "Drag the playhead to scrub",
]


class UIStaticInspector:
    """Inspects frontend files for migration completeness, Ionic Cupertino mode, themes, and UI rigor."""

    def __init__(self, frontend_dir: Path) -> None:
        self.frontend_dir = frontend_dir

    def inspect_legacy_files(self) -> list[str]:
        """Return list of legacy Next.js files/folders still present in the frontend tree."""
        found = []
        for rel in LEGACY_NEXT_INDICATORS:
            target = self.frontend_dir / rel
            if target.exists():
                found.append(rel)
        return found

    def inspect_vite_ionic_files(self) -> list[str]:
        """Return list of required Vite + Ionic files missing from frontend."""
        missing = []
        for rel in VITE_IONIC_REQUIRED_FILES:
            target = self.frontend_dir / rel
            if not target.exists():
                missing.append(rel)
        return missing

    def inspect_cupertino_mode(self) -> dict[str, bool]:
        """Verify that iOS Cupertino mode is configured in index.html and App.tsx."""
        results = {"index_html_ios_mode": False, "app_tsx_ios_setup": False}

        index_html = self.frontend_dir / "index.html"
        if index_html.exists():
            content = index_html.read_text(encoding="utf-8")
            if 'mode="ios"' in content or "mode='ios'" in content:
                results["index_html_ios_mode"] = True

        app_tsx = self.frontend_dir / "src/App.tsx"
        if app_tsx.exists():
            content = app_tsx.read_text(encoding="utf-8")
            if re.search(r"setupIonicReact\(\s*\{\s*mode:\s*['\"]ios['\"]", content):
                results["app_tsx_ios_setup"] = True

        return results

    def inspect_theme_variables(self) -> dict[str, list[str]]:
        """Verify CSS variable declarations for light and dark palettes in variables.css."""
        var_file = self.frontend_dir / "src/theme/variables.css"
        if not var_file.exists():
            return {"missing_file": ["variables.css"]}

        content = var_file.read_text(encoding="utf-8")
        required_vars = [
            "--ion-background-color",
            "--ion-text-color",
            "--studio-panel-bg",
            "--studio-panel-border",
        ]

        missing_light = [v for v in required_vars if v not in content]
        has_dark_selector = ".dark" in content or ".ion-palette-dark" in content
        return {
            "missing_variables": missing_light,
            "has_dark_palette": [str(has_dark_selector)],
        }

    def inspect_formation_tabs(self) -> list[str]:
        """Verify FormationPitchCard implements the 5 canonical tabs."""
        card_file = self.frontend_dir / "src/components/dashboard/FormationPitchCard.tsx"
        if not card_file.exists():
            return []
        content = card_file.read_text(encoding="utf-8")
        expected_tabs = ["LINEUP", "STATISTICS", "SUMMARY", "PLAYERS", "COMMENTS"]
        found = [tab for tab in expected_tabs if tab in content]
        return found

    def inspect_zero_clutter_doctrine(self) -> list[str]:
        """Check for banned instructional helper copy in components (AGENT_RULES.md §3)."""
        violations = []
        for p in self.frontend_dir.rglob("*.tsx"):
            if "node_modules" in p.parts:
                continue
            text = p.read_text(encoding="utf-8")
            for banned in BANNED_HELPER_TEXTS:
                if banned in text:
                    violations.append(f"{p.relative_to(self.frontend_dir)}: contains '{banned}'")
        return violations
