# Quickstart: A2A & MCP Developer Integration

This guide explains how to connect external AI assistants (such as Claude Desktop) to the Hermes CMS MCP Server, and perform test calls in development.

---

## 1. Local Stdio Integration with Claude Desktop

To connect Claude Desktop to Hermes CMS:

1. Locate the Claude Desktop configuration file:
   - **macOS/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Open the file and add the `hermes-mcp` server entry:

```json
{
  "mcpServers": {
    "hermes-mcp": {
      "command": "/bin/bash",
      "args": ["-c", "/home/itlight/dev/hermes-cms/scripts/run-mcp-stdio.sh"],
      "env": {
        "HERMES_API_KEY": "your-hermes-tenant-api-key-here"
      }
    }
  }
}
```

3. Obtain a valid Hermes API Key from your local CMS Admin:
   - Go to: `http://localhost:3000/admin`
   - Navigate to **API Keys** collection.
   - Create an API key with standard tenant selection.
   - Copy the generated API Key and replace `your-hermes-tenant-api-key-here` in the Claude config.

4. **Restart Claude Desktop**. You should see the Hammer icon in Claude, indicating that the tools from Hermes CMS have been discovered!

---

## 2. Testing via SSE (HTTP Server-Sent Events)

To test the Server-Sent Events integration in development:

### 1. Establish SSE Connection
Run a curl command to listen to the SSE stream:

```bash
curl -N -H "X-API-Key: <your-hermes-api-key>" http://localhost:8000/api/v1/mcp/sse
```

Expected output:
```text
event: endpoint
data: /api/v1/mcp/message?session_id=sse-session-1234abcd
```

### 2. Post a JSON-RPC Message
In another terminal, send a tool call request using the endpoint provided:

```bash
curl -X POST -H "Content-Type: application/json" \
  -H "X-API-Key: <your-hermes-api-key>" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "draft_content",
      "arguments": {
        "prompt": "Create a short blog about Alexandria editorial style.",
        "content_type_slug": "posts"
      }
    },
    "id": 1
  }' \
  "http://localhost:8000/api/v1/mcp/message?session_id=sse-session-1234abcd"
```

The response of the tool execution will stream back to the open curl connection on port 8000.
