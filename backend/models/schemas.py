from pydantic import BaseModel
from typing import Optional


class AnalyzeRequest(BaseModel):
    url: str


class AnalyzeResponse(BaseModel):
    html: str
    title: str
    url: str


class ModifyRequest(BaseModel):
    element_html: str
    styles: dict
    instruction: str
    context: Optional[dict] = None       # Parent/sibling info
    accessibility: Optional[dict] = None # ARIA roles/states
    box_model: Optional[dict] = None     # Padding/border/margin breakdown


class ModifyResponse(BaseModel):
    """
    Response from the modify endpoint.
    Returns a JSON patch instead of full HTML for better scalability.
    """
    patch: dict  # { style?, text?, attrs?, __legacy_html? }
