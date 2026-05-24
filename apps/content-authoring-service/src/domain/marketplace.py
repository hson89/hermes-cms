from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional
import pybreaker

@dataclass(frozen=True)
class JWTClaims:
    tenant_id: str
    app_id: str
    scopes: List[str]
    user_id: str

class MarketplaceCircuitBreaker:
    """
    Story 4: Circuit Breaker Policy
    Trips after 3 failures, >5000ms timeout logic is handled by the caller/adapter.
    """
    def __init__(self, name: str):
        self.breaker = pybreaker.CircuitBreaker(
            fail_max=3,
            reset_timeout=60, # Stay OPEN for 60s
            name=name
        )
