# Schema Validator Domain Tests

> 35 nodes · cohesion 0.08

## Key Concepts

- **test_generate_schema.py** (17 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **validate_content_schema()** (16 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- **TestClient** (8 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **schema_validator.py** (4 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- **_validate_field_definitions()** (4 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- **test_endpoint_generate_schema_validation_error_code()** (4 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_endpoint_generate_schema_contract()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_accepts_array_with_nested_fields()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_accepts_blocks_with_nested_fields()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_accepts_unique_and_localized_attributes()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_accepts_valid_schema()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_rejects_duplicate_field_names()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_rejects_invalid_array_structure()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_rejects_invalid_blocks_structure()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_rejects_invalid_unique_or_localized_types()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_rejects_missing_name_or_fields()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **test_validator_rejects_unsupported_field_type()** (3 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **client()** (2 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **Any** (1 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- **Domain Content Schema Validator. Satisfies T011.  Enforces structural validity a** (1 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- **Validate that the generated content schema conforms strictly to the system's str** (1 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- **Recursively validates a list of field definitions.** (1 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- **Failing TDD unit and contract tests for /api/ai/generate-schema. Satisfies T009.** (1 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **Verify that a schema with a valid blocks field containing block definitions pass** (1 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- **Verify that array fields with missing or empty subfields list are strictly rejec** (1 connections) — `apps/content-authoring-service/tests/test_generate_schema.py`
- *... and 10 more nodes in this community*

## Relationships

- [[Module Group 48]] (6 shared connections)
- [[AI Authoring Service Core]] (4 shared connections)
- [[AI Self-Correction Loop]] (1 shared connections)
- [[Module Group 304]] (1 shared connections)
- [[AI Copilot Drafting Service]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/domain/schema_validator.py`
- `apps/content-authoring-service/tests/test_generate_schema.py`

## Audit Trail

- EXTRACTED: 78 (74%)
- INFERRED: 27 (26%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*