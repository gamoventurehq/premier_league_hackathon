#!/usr/bin/env python3
"""Standalone E2E Test Suite Runner for Premier League Studio.

Runs Tiers 1-4, reports results per tier, and generates a structured summary.
Usage:
    backend/.venv/bin/python tests/e2e/run_e2e.py
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import pytest

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
TESTS_E2E_DIR = WORKSPACE_ROOT / "tests" / "e2e"

TIER_FILES = {
    "Tier 1 (Feature Coverage)": "test_tier1_feature_coverage.py",
    "Tier 2 (Boundary Cases)": "test_tier2_boundary_cases.py",
    "Tier 3 (Cross-Feature)": "test_tier3_cross_feature.py",
    "Tier 4 (Real-World Scenarios)": "test_tier4_real_world.py",
}


def run_tier(tier_name: str, test_filename: str) -> dict[str, Any]:
    """Run a single test tier file and collect metrics."""
    test_path = str(TESTS_E2E_DIR / test_filename)
    start_time = time.time()

    # Run pytest directly on this file
    ret = pytest.main([test_path, "-v", "--tb=short", "-q"])
    elapsed = round(time.time() - start_time, 2)

    return {
        "tier": tier_name,
        "file": test_filename,
        "exit_code": int(ret),
        "status": "PASSED" if ret == 0 else "FAILED",
        "duration_seconds": elapsed,
    }


def main() -> int:
    print("=" * 70)
    print(" Premier League Studio — E2E Test Suite Runner")
    print(f" Target Directory: {TESTS_E2E_DIR}")
    print("=" * 70)

    summary_results = []
    total_failures = 0

    for tier_name, test_filename in TIER_FILES.items():
        print(f"\n--- Running {tier_name} ({test_filename}) ---")
        res = run_tier(tier_name, test_filename)
        summary_results.append(res)
        if res["exit_code"] != 0:
            total_failures += 1

    print("\n" + "=" * 70)
    print(" E2E Test Execution Summary")
    print("=" * 70)
    for res in summary_results:
        status_label = "✅ PASS" if res["status"] == "PASSED" else "❌ FAIL"
        print(f" {status_label} | {res['tier']:<32} | {res['duration_seconds']:>5.2f}s")
    print("=" * 70)

    report_path = TESTS_E2E_DIR / "results.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary_results, f, indent=2)
    print(f"Execution report saved to: {report_path}\n")

    return 1 if total_failures > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
