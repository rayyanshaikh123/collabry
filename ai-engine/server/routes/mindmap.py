"""Mindmap endpoints.

This module intentionally only exposes rendering/conversion endpoints used by the frontend viewer.
Mindmap *generation* should happen via the chat/tool pipeline (tools.generate_mindmap) for consistent
provider behavior (OpenAI vs OpenAI-compatible) and consistent JSON output.
"""

from fastapi import APIRouter, Depends
from server.deps import get_current_user
import logging
from fastapi import Body, Query
from fastapi.responses import JSONResponse
from typing import Optional
from tools.tool_loader import load_tools

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["mindmap"])
@router.post(
    "/mindmap/render",
    summary="Render mindmap (Mermaid or SVG)",
    description="Accepts a JSON mindmap tree and returns Mermaid code and optionally an SVG (base64)."
)
async def render_mindmap(
    mindmap: dict = Body(..., description="Mind map JSON structure"),
    format: Optional[str] = Query('svg', description="Output format: 'svg' or 'mermaid' or 'both'"),
    user_id: str = Depends(get_current_user)
) -> JSONResponse:
    """Render a provided mindmap JSON into Mermaid and/or Graphviz SVG using the internal tool.

    Expects the mindmap shape compatible with `MindMapNode` (id, label, children).
    """
    try:
        logger.info(f"Mindmap render request from user={user_id}, format={format}")

        # Load tools and locate mindmap_generator
        tools_registry = load_tools()
        mg_tool = tools_registry.get('mindmap_generator')
        if not mg_tool:
            return JSONResponse({"error": "mindmap_generator tool not available"}, status_code=500)

        func = mg_tool.get('func')
        if not callable(func):
            return JSONResponse({"error": "mindmap_generator tool invalid"}, status_code=500)

        # Call the tool - it returns mermaid and svg_base64 when possible
        result = func(mindmap)

        # Prepare response based on requested format
        out: dict = {"mermaid": result.get('mermaid'), "json": result.get('json')}
        if format in ('svg', 'both'):
            out['svg_base64'] = result.get('svg_base64')

        return JSONResponse(out)
    except Exception as e:
        logger.exception(f"Failed to render mindmap: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
