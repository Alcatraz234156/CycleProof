"""Optional Strands/Bedrock explanation layer.

All numeric heat-risk decisions are made before this module is called.
"""

from __future__ import annotations

import json
import os
from typing import Any


def explain_shift_plan(plan: dict[str, Any]) -> str:
    if os.environ.get("ENABLE_AI_EXPLANATION", "false").lower() != "true":
        raise RuntimeError("AI explanation is disabled; set ENABLE_AI_EXPLANATION=true to enable it")
    try:
        from strands import Agent
    except ImportError as exc:
        raise RuntimeError("Strands Agents SDK is not installed") from exc

    instructions = (
        "Explain this deterministic heat-safety shift plan in plain language. "
        "Do not invent thresholds, modify risk levels, or claim conditions are safe. "
        "State that workplace procedures and emergency response take precedence. "
        f"Structured plan: {json.dumps(plan)}"
    )
    agent = Agent(
        model=os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0"),
        system_prompt=(
            "You are a safety communication assistant. Only explain the supplied "
            "structured results; never perform new safety calculations."
        ),
    )
    result = agent(instructions)
    return str(result)
