"""
Application service for orchestrating the Template Builder Agent.
"""

import logging
from typing import Any, Dict, Optional
from src.application.ai_service import AIService
from src.infrastructure.clients.cms_client import CMS_CLIENT_SINGLETON

logger = logging.getLogger(__name__)

class TemplateBuilderService:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    async def generate_template(
        self,
        design_html: str,
        tenant_id: str,
        user_id: str,
        template_builder_graph: Any,
        model_override: Optional[str] = None,
        langfuse_trace_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Runs the template builder graph to analyze HTML and register templates in CMS.
        """
        # Build initial state
        initial_state = {
            "design_html": design_html,
            "tenant_id": tenant_id,
            "user_id": user_id,
            "templates": [],
            "errors": [],
            "retry_count": 0,
            "cms_results": [],
            "messages": []
        }

        # Configure graph execution
        config = {
            "configurable": {
                "ai_service": self.ai_service,
                "cms_client": CMS_CLIENT_SINGLETON,
                "model_override": model_override,
                "thread_id": f"template_builder_{tenant_id}_{user_id}"
            }
        }

        try:
            # Execute graph
            final_state = await template_builder_graph.ainvoke(initial_state, config=config)
            
            if final_state.get("errors"):
                logger.warning(f"Template builder finished with errors: {final_state['errors']}")

            return {
                "templates": final_state.get("templates", []),
                "cms_results": final_state.get("cms_results", []),
                "explanation": final_state.get("explanation", ""),
                "status": "completed" if not final_state.get("errors") else "partial_success",
                "errors": final_state.get("errors", [])
            }
        except Exception as e:
            logger.error(f"Error executing template builder graph: {str(e)}")
            return {
                "status": "failed",
                "errors": [str(e)]
            }
