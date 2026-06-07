from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ContentField(BaseModel):
    name: str = Field(..., description="The internal field name (camelCase)")
    type: str = Field(..., description="Payload CMS field type (text, textarea, richText, upload, array, etc.)")
    label: str = Field(..., description="User-friendly display label")
    required: bool = Field(False, description="Whether the field is mandatory")
    relationTo: Optional[str] = Field(None, description="For 'upload' or 'relationship' fields, the target collection (e.g., 'media')")
    fields: Optional[List[ContentField]] = Field(None, description="For 'array' or 'group' types, nested fields")

class ContentTypeDefinition(BaseModel):
    name: str = Field(..., description="Display name of the Content Type")
    slug: str = Field(..., description="URL-friendly slug")
    fields: List[ContentField] = Field(..., description="List of schema fields")

class PageTemplateDefinition(BaseModel):
    name: str = Field(..., description="Name of the Page Template")
    slug: str = Field(..., description="Unique slug for the template")
    htmlContent: str = Field(..., description="Parameterized HTML content with {{ variable }} placeholders")
    contentType: ContentTypeDefinition = Field(..., description="The schema definition extracted from the design")
    thumbnail: Optional[str] = Field(None, description="Suggested thumbnail URL or description for generation")

class TemplateBuilderOutput(BaseModel):
    """Final output from the template builder agent."""
    templates: List[PageTemplateDefinition] = Field(..., description="The generated page templates and their schemas")
    explanation: str = Field(..., description="Brief summary of the design analysis and mapping decisions")
