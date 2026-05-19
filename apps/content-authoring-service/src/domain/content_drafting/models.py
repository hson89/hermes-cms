"""
ContentDraft domain model for AI-generated content drafts.

T012 - Implement Pydantic domain entities (ContentDraft, DraftField)
"""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class DraftField(BaseModel):
    """
    A single field in a content draft.
    Can represent a simple text field or a complex rich-text field.
    """

    name: str
    value: Any
    field_type: str = Field(alias="type")  # e.g., "text", "richText", "select"

    class Config:
        populate_by_name = True


class ContentDraft(BaseModel):
    """
    Domain entity representing an AI-generated draft of a content item.
    """

    content_type_slug: str
    fields: list[DraftField] = Field(default_factory=list)
    locale: str = "en"
    title_suggestion: Optional[str] = None

    def get_field_value(self, name: str) -> Any:
        """Helper to retrieve a field value by name."""
        for field in self.fields:
            if field.name == name:
                return field.value
        return None

    def set_field_value(self, name: str, value: Any, field_type: str = "text") -> None:
        """Helper to set or update a field value."""
        for field in self.fields:
            if field.name == name:
                field.value = value
                field.field_type = field_type
                return
        self.fields.append(DraftField(name=name, value=value, type=field_type))
