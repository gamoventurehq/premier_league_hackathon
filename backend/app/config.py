"""Service configuration.

Every Azure setting is optional. The service is designed to run perfectly with
zero Azure credentials configured (ADR 0006 - graceful degradation is
mandatory). Azure clients are created lazily by the modules in
``app/services/``; nothing here imports an Azure SDK.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings, populated from the environment (or a local ``.env``)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Service -----------------------------------------------------------
    app_name: str = "Premier League Studio Backend"
    service_version: str = "0.1.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    cors_origins: str = "*"

    # --- Simulation --------------------------------------------------------
    #: Internal engine rate (ADR 0003 - 10 Hz).
    simulation_hz: int = 10
    #: WebSocket publication rate (ADR 0003 - 5 Hz).
    publish_hz: int = 5
    default_scenario: str = "high_possession"
    #: Simulated seconds of match history generated before the stream opens.
    sim_warmup_seconds: int = 480
    #: Integration step used while fast-forwarding history.
    sim_fast_forward_dt: float = 0.2
    #: Restart the match automatically when the 90th minute is reached.
    sim_loop_on_full_time: bool = True
    random_seed: int = 20260922

    # --- Tiered Fast-Path (ADR 0004) ---------------------------------------
    fast_path_budget_ms: int = 50
    agent_timeout_ms: int = 1500

    # --- Azure (all optional) ----------------------------------------------
    azure_ai_foundry_endpoint: str | None = None
    azure_ai_foundry_deployment: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_api_version: str = "2024-10-21"
    azure_event_hubs_connection_string: str | None = None
    azure_event_hubs_name: str | None = None
    cosmos_db_account: str | None = None
    cosmos_db_database: str = "plstudio"
    cosmos_db_container: str = "overlays"
    cosmos_db_key: str | None = None
    azure_mcp_server_url: str | None = None

    # --- Unified LLM Provider Settings (OpenAI / GitHub / Ollama / Azure) --
    llm_provider: str | None = None
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    github_token: str | None = None
    llm_timeout_seconds: float = 10.0
    llm_max_tokens: int = 250

    @property
    def active_llm_provider(self) -> str | None:
        if self.llm_provider:
            return self.llm_provider.strip().lower()
        if self.azure_ai_foundry_endpoint and (self.azure_openai_api_key or self.azure_ai_foundry_deployment):
            return "azure"
        if self.llm_base_url:
            base = self.llm_base_url.lower()
            if "11434" in base or "ollama" in base:
                return "ollama"
            if "github" in base or "inference.ai.azure.com" in base:
                return "github"
            return "openai"
        if self.github_token:
            return "github"
        if self.llm_api_key:
            return "openai"
        return None

    @property
    def llm_enabled(self) -> bool:
        azure_configured = bool(
            self.azure_ai_foundry_endpoint and (self.azure_openai_api_key or self.azure_ai_foundry_deployment)
        )
        return bool(
            azure_configured
            or self.llm_provider
            or self.llm_base_url
            or self.github_token
            or self.llm_api_key
        )

    @property
    def foundry_enabled(self) -> bool:
        """Alias for backward compatibility."""
        return self.llm_enabled

    @property
    def effective_llm_base_url(self) -> str:
        if self.llm_base_url:
            return self.llm_base_url.rstrip("/")
        provider = self.active_llm_provider
        if provider == "github":
            return "https://models.github.ai/inference"
        if provider == "ollama":
            return "http://localhost:11434/v1"
        if provider == "azure":
            return (self.azure_ai_foundry_endpoint or "").rstrip("/")
        return "http://localhost:11434/v1"

    @property
    def effective_llm_api_key(self) -> str | None:
        if self.llm_api_key:
            return self.llm_api_key
        provider = self.active_llm_provider
        if provider == "github":
            return self.github_token
        if provider == "azure":
            return self.azure_openai_api_key
        return None

    @property
    def effective_llm_model(self) -> str:
        if self.llm_model:
            return self.llm_model
        provider = self.active_llm_provider
        if provider == "azure":
            return self.azure_ai_foundry_deployment or "gpt-4o"
        if provider == "github":
            return "gpt-4o-mini"
        if provider == "ollama":
            return "llama3.2"
        return "llama3.2"

    @property
    def event_hubs_enabled(self) -> bool:
        return bool(self.azure_event_hubs_connection_string and self.azure_event_hubs_name)

    @property
    def cosmos_enabled(self) -> bool:
        return bool(self.cosmos_db_account)

    @property
    def mcp_enabled(self) -> bool:
        return bool(self.azure_mcp_server_url)

    def azure_capabilities(self) -> dict[str, bool]:
        """Capability map surfaced by ``GET /health``."""
        return {
            "foundry": self.foundry_enabled,
            "eventHubs": self.event_hubs_enabled,
            "cosmos": self.cosmos_enabled,
            "mcp": self.mcp_enabled,
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor (safe to call from anywhere)."""
    return Settings()


__all__ = ["Settings", "get_settings"]
