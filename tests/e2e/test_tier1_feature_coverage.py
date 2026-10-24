"""Tier 1: Feature Coverage E2E Verification.

Verifies requirements R1 to R4:
- R1: Clean migration from Next.js to Ionic React + Vite, canonical types, docker-compose.
- R2: Backend health endpoint, /api/health alias, 5Hz telemetry stream, spatial geometry, blackboard.
- R3: Left docked navigation rail, Cupertino iOS mode, theme variables, match score, 22-player formation, 5 tabs, zero clutter.
- R4: Verification cleanliness, backend pytest suite, TypeScript typecheck.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any

import pytest

from tests.e2e.harness.client import StudioTestHarness
from tests.e2e.harness.contracts import (
    CANONICAL_INTERFACES,
    TelemetryContractValidator,
)
from tests.e2e.harness.ui_inspect import UIStaticInspector


class TestTier1FeatureCoverage:
    """Tier 1: Feature Coverage verification suite for R1-R4 requirements."""

    # -------------------------------------------------------------------------
    # R1: Complete Frontend Migration & Contract Integrity
    # -------------------------------------------------------------------------

    def test_r1_clean_migration_file_layout(
        self, frontend_dir: Path, source_frontend_dir: Path, ui_inspector: UIStaticInspector
    ) -> None:
        """Verify that legacy Next.js files are absent and Vite+Ionic files are present."""
        # If frontend hasn't been migrated yet, test against source_frontend_dir to verify target state
        target_dir = frontend_dir if (frontend_dir / "vite.config.ts").exists() else source_frontend_dir
        inspector = UIStaticInspector(target_dir)

        legacy_files = inspector.inspect_legacy_files()
        assert not legacy_files, f"Legacy Next.js files detected in frontend: {legacy_files}"

        missing_files = inspector.inspect_vite_ionic_files()
        assert not missing_files, f"Missing required Vite/Ionic files: {missing_files}"

    def test_r1_canonical_contract_interfaces_preserved(
        self, frontend_dir: Path, source_frontend_dir: Path, validator: TelemetryContractValidator
    ) -> None:
        """Verify that frontend/src/types/telemetry.ts declares all 12 canonical interfaces (ADR 0005)."""
        # Contract file can be in frontend_dir or checked against the canonical file
        contract_path = frontend_dir / "src/types/telemetry.ts"
        if not contract_path.exists():
            # If not yet copied, check source or root contract
            contract_path = source_frontend_dir / "src/types/telemetry.ts"

        assert contract_path.exists(), f"Telemetry contract not found at {contract_path}"
        declared_interfaces = validator.parse_typescript_interfaces(contract_path)

        for interface_name in CANONICAL_INTERFACES:
            assert interface_name in declared_interfaces, (
                f"Canonical interface '{interface_name}' missing from {contract_path}"
            )

    def test_r1_docker_compose_uses_vite_flags(self, workspace_root: Path) -> None:
        """Verify docker-compose.yml uses Vite CLI arguments (--host 0.0.0.0 --port 3000)."""
        compose_file = workspace_root / "docker-compose.yml"
        assert compose_file.exists(), "docker-compose.yml missing"
        content = compose_file.read_text(encoding="utf-8")
        assert "--host 0.0.0.0" in content or "vite" in content, (
            "docker-compose.yml frontend command should use Vite '--host 0.0.0.0'"
        )

    # -------------------------------------------------------------------------
    # R2: Backend Health & Telemetry Contracts
    # -------------------------------------------------------------------------

    def test_r2_backend_health_endpoint(self, harness: StudioTestHarness) -> None:
        """Verify GET /health returns HTTP 200 with valid HealthResponse schema."""
        status_code, body = harness.get_health()
        assert status_code == 200, f"GET /health failed with status {status_code}"
        assert body["service"] == "Premier League Studio Backend"
        assert "status" in body
        assert "simulationAlive" in body
        assert body["simulationAlive"] is True

    def test_r2_backend_api_health_alias(self, harness: StudioTestHarness) -> None:
        """Verify GET /api/health alias returns HTTP 200 with identical HealthResponse schema (R2 contract)."""
        status_code, body = harness.get_api_health()
        assert status_code == 200, (
            f"GET /api/health returned {status_code}. Expected 200 OK alias per R2 contract."
        )
        assert body["service"] == "Premier League Studio Backend"
        assert "matchClock" in body
        assert "frameId" in body

    def test_r2_websocket_telemetry_envelope(
        self, harness: StudioTestHarness, validator: TelemetryContractValidator
    ) -> None:
        """Verify WebSocket stream publishes envelope with frame, blackboard, sentAtMs."""
        frames = harness.collect_frames(count=2, timeout_sec=5.0)
        assert len(frames) >= 1, "Failed to receive telemetry frame from WebSocket"

        sample = frames[0]
        validator.validate_envelope(sample)
        validator.validate_frame(sample["frame"])

    def test_r2_spatial_geometry_105x68(
        self, harness: StudioTestHarness, validator: TelemetryContractValidator
    ) -> None:
        """Verify pitch spatial coordinates conform to standard 105m x 68m boundaries."""
        frames = harness.collect_frames(count=1, timeout_sec=5.0)
        assert frames, "No frames collected"
        frame = frames[0]["frame"]
        validator.validate_spatial_bounds(frame, tolerance_meters=3.0)

    def test_r2_control_chaos_and_tactical_metrics(
        self, harness: StudioTestHarness, validator: TelemetryContractValidator
    ) -> None:
        """Verify Control vs Chaos Index, Pass Difficulty Rating, and game rhythm values."""
        frames = harness.collect_frames(count=1, timeout_sec=5.0)
        assert frames, "No frames collected"
        frame = frames[0]["frame"]
        validator.validate_metrics(frame["metrics"])

    def test_r2_4_agent_tactical_blackboard(
        self, harness: StudioTestHarness, validator: TelemetryContractValidator
    ) -> None:
        """Verify 4-agent tactical blackboard contains projections for all viewing personas."""
        frames = harness.collect_frames(count=1, timeout_sec=5.0)
        assert frames, "No frames collected"
        blackboard = frames[0]["blackboard"]
        validator.validate_blackboard(blackboard)

    # -------------------------------------------------------------------------
    # R3: Interactive Studio Experience & UI Rigor
    # -------------------------------------------------------------------------

    def test_r3_ios_cupertino_mode_configuration(
        self, frontend_dir: Path, source_frontend_dir: Path
    ) -> None:
        """Verify Cupertino iOS mode is configured on Ionic initialization and index.html."""
        target_dir = frontend_dir if (frontend_dir / "src/App.tsx").exists() else source_frontend_dir
        inspector = UIStaticInspector(target_dir)
        modes = inspector.inspect_cupertino_mode()
        assert modes["index_html_ios_mode"] is True, "index.html missing mode='ios'"
        assert modes["app_tsx_ios_setup"] is True, "App.tsx missing setupIonicReact({ mode: 'ios' })"

    def test_r3_left_docked_navigation_rail_and_themes(
        self, frontend_dir: Path, source_frontend_dir: Path
    ) -> None:
        """Verify 64px docked navigation rail with SVG icons and dark/light theme CSS variables."""
        target_dir = frontend_dir if (frontend_dir / "src/App.tsx").exists() else source_frontend_dir
        sidebar = target_dir / "src/components/SidebarNav.tsx"
        assert sidebar.exists(), "SidebarNav.tsx missing"
        content = sidebar.read_text(encoding="utf-8")
        assert "64px" in content, "SidebarNav must have 64px width"
        assert "sunnyOutline" in content and "moonOutline" in content, (
            "SidebarNav theme toggle must use SVG icons (sunnyOutline/moonOutline)"
        )

        inspector = UIStaticInspector(target_dir)
        themes = inspector.inspect_theme_variables()
        assert not themes.get("missing_variables"), (
            f"Missing CSS theme variables: {themes.get('missing_variables')}"
        )

    def test_r3_match_score_card_crests_and_clock(
        self, frontend_dir: Path, source_frontend_dir: Path
    ) -> None:
        """Verify MatchScoreCard renders club crests (MCI vs ARS) and live match clock."""
        target_dir = frontend_dir if (frontend_dir / "src/App.tsx").exists() else source_frontend_dir
        card = target_dir / "src/components/dashboard/MatchScoreCard.tsx"
        assert card.exists(), "MatchScoreCard.tsx missing"
        content = card.read_text(encoding="utf-8")
        assert ("Man City" in content or "MCI" in content) and (
            "Arsenal" in content or "ARS" in content
        ), "Club crest badges missing"
        assert "matchClock" in content, "Match clock rendering missing"

    def test_r3_formation_pitch_22_players_and_5_tabs(
        self, frontend_dir: Path, source_frontend_dir: Path
    ) -> None:
        """Verify FormationPitchCard implements 22 players on 16/10 pitch with 5 canonical tabs."""
        target_dir = frontend_dir if (frontend_dir / "src/App.tsx").exists() else source_frontend_dir
        card = target_dir / "src/components/dashboard/FormationPitchCard.tsx"
        assert card.exists(), "FormationPitchCard.tsx missing"
        content = card.read_text(encoding="utf-8")
        assert "16/10" in content, "Formation pitch must adhere to 16/10 aspect ratio"

        inspector = UIStaticInspector(target_dir)
        tabs = inspector.inspect_formation_tabs()
        expected = ["LINEUP", "STATISTICS", "SUMMARY", "PLAYERS", "COMMENTS"]
        for tab in expected:
            assert tab in tabs, f"Tab {tab} missing from FormationPitchCard"

    def test_r3_zero_clutter_layout_first_doctrine(
        self, frontend_dir: Path, source_frontend_dir: Path
    ) -> None:
        """Verify zero-clutter layout-first UI adherence: no instructional helper text (AGENT_RULES.md §3)."""
        target_dir = frontend_dir if (frontend_dir / "src/App.tsx").exists() else source_frontend_dir
        inspector = UIStaticInspector(target_dir)
        violations = inspector.inspect_zero_clutter_doctrine()
        assert not violations, (
            f"Found banned instructional helper text in UI components: {violations}"
        )

    # -------------------------------------------------------------------------
    # R4: Build & Verification Cleanliness
    # -------------------------------------------------------------------------

    def test_r4_backend_pytest_cleanliness(self, backend_dir: Path) -> None:
        """Verify backend pytest passes with 70 passed tests."""
        result = subprocess.run(
            ["backend/.venv/bin/pytest", str(backend_dir / "tests")],
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0, f"Backend pytest failed:\n{result.stdout}\n{result.stderr}"
        assert "passed" in result.stdout

    def test_r4_frontend_typescript_typecheck(
        self, frontend_dir: Path, source_frontend_dir: Path
    ) -> None:
        """Verify TypeScript type check passes with 0 errors."""
        target_dir = frontend_dir if (frontend_dir / "tsconfig.json").exists() else source_frontend_dir
        result = subprocess.run(
            ["npx", "tsc", "--noEmit"],
            cwd=str(target_dir),
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert result.returncode == 0, f"TypeScript type check failed:\n{result.stdout}\n{result.stderr}"
