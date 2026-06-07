# Quickstart Guide: Template Builder Agent

This guide describes how to run and test the Template Builder Agent.

## Setup

Ensure your local development environment is running:

```bash
# Start infrastructure and application microservices
./scripts/start-local.sh
```

## Running Tests

We implement pytest unit and integration tests to verify the template builder graph.

To run tests in the `content-authoring-service`:

```bash
cd apps/content-authoring-service
./venv/bin/pytest tests/application/graphs/test_template_builder.py
```

## Testing via MCP

You can test the MCP tool execution using the CLI transport or Claude Desktop.

### 1. Configure Claude Desktop

Add the Hermes MCP server configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hermes-ai": {
      "command": "/bin/bash",
      "args": ["/home/itlight/dev/hermes-cms/scripts/run-mcp-stdio.sh"],
      "env": {
        "HERMES_API_KEY": "your_tenant_api_key_here"
      }
    }
  }
}
```

### 2. Invoke the Tool

Ask Claude:

```text
Convert this HTML design into a reusable template:
<div class="hero">
  <h1>Welcome to our landing page!</h1>
  <p>Discover high-end CMS capabilities with Hermes AI.</p>
  <img src="/assets/hero.jpg" alt="Hero background" />
  <a href="/get-started">Start now</a>
</div>
```

The agent will parse the HTML, create the content schema and template, register them in the CMS under your tenant, and report back.
