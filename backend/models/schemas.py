from pydantic import BaseModel


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


class ModifyResponse(BaseModel):
    modified_html: str
