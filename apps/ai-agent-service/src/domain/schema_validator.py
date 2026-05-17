"""
Domain Content Schema Validator.
Satisfies T011.

Enforces structural validity and strictly checks against supported Payload field types.
"""

from __future__ import annotations

import re
from typing import Any


class InvalidSchemaError(ValueError):
    """Raised when a generated schema violates Hermes content-modeling constraints."""
    pass


# Supported Payload CMS field types as defined in the feature specification and DESIGN.md
SUPPORTED_FIELD_TYPES = {
    "text",
    "number",
    "boolean",
    "date",
    "richText",
    "json",
    "relationship",
    "select",
    "upload",
}


def validate_content_schema(schema: Any) -> None:
    """
    Validate that the generated content schema conforms strictly to the system's structural constraints.
    
    Raises:
        InvalidSchemaError: if any validation rule is violated.
    """
    if not isinstance(schema, dict):
        raise InvalidSchemaError("Schema must be a JSON object (dictionary).")

    # 1. Check root level keys
    if "name" not in schema or not schema["name"] or not isinstance(schema["name"], str):
        raise InvalidSchemaError("name is required and must be a non-empty string.")

    if "fields" not in schema or not isinstance(schema["fields"], list):
        raise InvalidSchemaError("fields is required and must be a list of field definitions.")

    # 2. Check each field
    seen_names = set()
    for field in schema["fields"]:
        if not isinstance(field, dict):
            raise InvalidSchemaError("Each field definition must be a JSON object.")

        # Ensure required keys exist
        for key in ("name", "type", "label"):
            if key not in field or not field[key]:
                raise InvalidSchemaError(f"Field is missing required attribute '{key}': {field}")

        name = field["name"]
        field_type = field["type"]
        label = field["label"]

        if not isinstance(name, str) or not name.strip():
            raise InvalidSchemaError(f"Field name must be a non-empty string: {field}")
        
        # Validate slug format (alphanumeric, camelCase, snake_case, kebab-case)
        if not re.match(r"^[a-zA-Z0-9_\-]+$", name):
            raise InvalidSchemaError(f"Field name '{name}' must be a valid alphanumeric slug.")

        # Check unique field name constraints
        if name in seen_names:
            raise InvalidSchemaError(f"Duplicate field name '{name}' detected in schema.")
        seen_names.add(name)

        # Validate against strictly supported field types
        if field_type not in SUPPORTED_FIELD_TYPES:
            raise InvalidSchemaError(
                f"Field '{name}' has unsupported type '{field_type}'. "
                f"Supported types are: {', '.join(sorted(SUPPORTED_FIELD_TYPES))}"
            )

        if "required" in field and not isinstance(field["required"], bool):
            raise InvalidSchemaError(f"Field '{name}' attribute 'required' must be a boolean.")
        
        if not isinstance(label, str) or not label.strip():
            raise InvalidSchemaError(f"Field '{name}' attribute 'label' must be a non-empty string.")
