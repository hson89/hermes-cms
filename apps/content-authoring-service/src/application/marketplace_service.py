from __future__ import annotations
import httpx
import pybreaker
from typing import Any, Dict, List, Optional
from langchain.tools import BaseTool
from src.domain.marketplace import MarketplaceCircuitBreaker, JWTClaims

class ExternalAppTool(BaseTool):
    """
    LangChain Tool wrapper for 3rd-party marketplace apps.
    Integrates pybreaker for fault tolerance.
    """
    name: str = "external_app_tool"
    description: str = "Call an external marketplace application"
    app_url: str
    tenant_id: str
    breaker: pybreaker.CircuitBreaker

    def _run(self, query: str) -> str:
        try:
            return self.breaker.call(self._call_external_api, query)
        except pybreaker.CircuitBreakerError:
            return "ERROR: The external tool is currently unavailable (Circuit Breaker OPEN). Please explain this outage to the user."
        except Exception as e:
            return f"ERROR: Failed to call external tool: {str(e)}"

    def _call_external_api(self, query: str) -> str:
        with httpx.Client(timeout=5.0) as client: # 5000ms timeout per AC
            response = client.post(
                f"{self.app_url}/execute",
                json={"query": query, "tenant_id": self.tenant_id}
            )
            response.raise_for_status()
            return response.text

class MarketplaceService:
    """
    Orchestrates marketplace app registration and tool creation.
    """
    def __init__(self):
        self._breakers: Dict[str, pybreaker.CircuitBreaker] = {}

    def get_tool_for_app(self, app_id: str, app_url: str, tenant_id: str) -> ExternalAppTool:
        breaker_key = f"{tenant_id}:{app_id}"
        if breaker_key not in self._breakers:
            self._breakers[breaker_key] = MarketplaceCircuitBreaker(name=breaker_key).breaker
        
        return ExternalAppTool(
            name=f"app_{app_id}",
            description=f"Marketplace app {app_id} integration",
            app_url=app_url,
            tenant_id=tenant_id,
            breaker=self._breakers[breaker_key]
        )
