"""Pytest configuration and shared fixtures for Premier League Studio E2E tests."""

import sys
from pathlib import Path
from typing import Generator

# Ensure workspace root is in sys.path
workspace_root_path = Path(__file__).resolve().parents[2]
if str(workspace_root_path) not in sys.path:
    sys.path.insert(0, str(workspace_root_path))

import pytest

from tests.e2e.harness.client import StudioTestHarness
from tests.e2e.harness.contracts import TelemetryContractValidator
from tests.e2e.harness.ui_inspect import UIStaticInspector


@pytest.fixture(scope="session")
def workspace_root() -> Path:
    """Return the absolute path to the workspace root."""
    return Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def frontend_dir(workspace_root: Path) -> Path:
    """Return path to workspace frontend directory."""
    return workspace_root / "frontend"


@pytest.fixture(scope="session")
def source_frontend_dir() -> Path:
    """Return path to source /tmp/plstudio/frontend directory."""
    return Path("/tmp/plstudio/frontend")


@pytest.fixture(scope="session")
def backend_dir(workspace_root: Path) -> Path:
    """Return path to backend directory."""
    return workspace_root / "backend"


@pytest.fixture(scope="module")
def harness() -> Generator[StudioTestHarness, None, None]:
    """Provide an active StudioTestHarness with FastAPI simulation lifespan."""
    with StudioTestHarness() as h:
        yield h


@pytest.fixture(scope="session")
def validator() -> TelemetryContractValidator:
    """Provide TelemetryContractValidator instance."""
    return TelemetryContractValidator()


@pytest.fixture(scope="session")
def ui_inspector(frontend_dir: Path, source_frontend_dir: Path) -> UIStaticInspector:
    """Provide UIStaticInspector inspecting current or source frontend."""
    # Use frontend_dir if migrated, else fallback to source_frontend_dir for testing
    inspect_dir = frontend_dir if (frontend_dir / "src/App.tsx").exists() else source_frontend_dir
    return UIStaticInspector(inspect_dir)
