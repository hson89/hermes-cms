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
    "array",
    "blocks",
}


def _validate_field_definitions(fields: list, seen_names: set) -> None:
    """Recursively validates a list of field definitions."""
    for field in fields:
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

        if "unique" in field and not isinstance(field["unique"], bool):
            raise InvalidSchemaError(f"Field '{name}' attribute 'unique' must be a boolean.")

        if "localized" in field and not isinstance(field["localized"], bool):
            raise InvalidSchemaError(f"Field '{name}' attribute 'localized' must be a boolean.")
        
        if not isinstance(label, str) or not label.strip():
            raise InvalidSchemaError(f"Field '{name}' attribute 'label' must be a non-empty string.")

        # Validate nested structures
        if field_type == "array":
            if "fields" not in field or not isinstance(field["fields"], list):
                raise InvalidSchemaError(f"Field '{name}' of type 'array' must contain a 'fields' list of subfields.")
            if not field["fields"]:
                raise InvalidSchemaError(f"Field '{name}' of type 'array' must contain a non-empty list of fields.")
            # Recursively validate array subfields with a fresh names scope for the array fields
            _validate_field_definitions(field["fields"], set())

        elif field_type == "blocks":
            if "blocks" not in field or not isinstance(field["blocks"], list):
                raise InvalidSchemaError(f"Field '{name}' of type 'blocks' must contain a 'blocks' list.")
            if not field["blocks"]:
                raise InvalidSchemaError(f"Field '{name}' of type 'blocks' must contain a non-empty list of blocks.")
            
            seen_block_slugs = set()
            for block in field["blocks"]:
                if not isinstance(block, dict):
                    raise InvalidSchemaError(f"Each block configuration inside field '{name}' must be a JSON object.")
                for key in ("slug", "label", "fields"):
                    if key not in block or not block[key]:
                        raise InvalidSchemaError(f"Block configuration in field '{name}' is missing required attribute '{key}': {block}")
                
                block_slug = block["slug"]
                block_label = block["label"]
                block_fields = block["fields"]

                if not isinstance(block_slug, str) or not block_slug.strip() or not re.match(r"^[a-zA-Z0-9_\-]+$", block_slug):
                    raise InvalidSchemaError(f"Block slug '{block_slug}' in field '{name}' must be a valid alphanumeric slug.")
                
                if block_slug in seen_block_slugs:
                    raise InvalidSchemaError(f"Duplicate block slug '{block_slug}' detected in field '{name}'.")
                seen_block_slugs.add(block_slug)

                if not isinstance(block_label, str) or not block_label.strip():
                    raise InvalidSchemaError(f"Block label inside field '{name}' must be a non-empty string.")
                
                if not isinstance(block_fields, list) or not block_fields:
                    raise InvalidSchemaError(f"Block '{block_slug}' inside field '{name}' must contain a non-empty list of fields.")
                
                # Recursively validate block subfields with a fresh names scope
                _validate_field_definitions(block_fields, set())


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

    # 2. Check each field using recursive validator helper
    _validate_field_definitions(schema["fields"], set())

