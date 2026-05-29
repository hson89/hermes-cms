# Feature Specification: A2A, MCP & A2UI Integration

**Feature Branch**: `007-a2a-mcp-integration`  
**Created**: 2026-05-29  
**Status**: Draft  
**Input**: User description: "I want to expose the @apps/content-authoring-service/ to support A2A, MCP proposal so that AI tools like Claude Desktop, ChatGPT, Gemini can work directly with my AI Agents and the user can use their AI tools to working directly and don't have to go to our UI to interact with my AI Agent. I want to also add support A2UI and AGUI (Agent-to-UI)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct Interaction via Claude Desktop (Priority: P1)

As a content creator, I want to connect my Claude Desktop application to Hermes CMS using the Model Context Protocol (MCP) so that I can draft and manage content using Hermes AI Agents directly within my favorite AI tool.

**Why this priority**: This is the core requirement. Enabling external AI tools to use Hermes Agents fulfills the primary goal of making the CMS "omnipresent" and reducing UI friction.

**Independent Test**: Can be tested by configuring Claude Desktop with the Hermes MCP server and successfully calling a "Draft Content" tool from the Claude interface.

**Acceptance Scenarios**:

1. **Given** the content-authoring-service is running as an MCP server, **When** Claude Desktop connects via stdio/transport, **Then** Claude should list all available Hermes Agent tools.
2. **Given** a valid API key, **When** I ask Claude to "create a blog post about Alexandria in Hermes CMS", **Then** the Hermes Agent should receive the request, process it, and return the draft to Claude.

---

### User Story 2 - Agent-to-Agent (A2A) Collaboration (Priority: P2)

As a user of an external AI assistant (like ChatGPT or a custom LangChain agent), I want that assistant to be able to delegate specific CMS tasks to Hermes Agents via a standardized A2A interface.

**Why this priority**: Supports the broader vision of an interconnected agent ecosystem where Hermes acts as a specialized content domain expert.

**Independent Test**: Can be tested using an external script/agent that sends an A2A-compliant request to the Hermes service and receives a structured response.

**Acceptance Scenarios**:

1. **Given** an external agent with a valid Hermes API key, **When** it sends a tool-call request to the Hermes A2A endpoint, **Then** the Hermes Agent should execute the task and return the result in a format the external agent can consume.

---

### User Story 3 - Rich Visual Feedback (A2UI / AGUI) (Priority: P2)

As an AI tool user, I want the Hermes Agents to provide rich, interactive UI components (like tables, charts, or content previews) directly in my AI interface so that I can visualize data and confirm changes without switching to the Hermes CMS dashboard.

**Why this priority**: Enhances the "Direct Interaction" goal by allowing agents to go beyond text and provide a native-feeling graphical interface (AGUI) within the host tool.

**Independent Test**: Can be tested by requesting a "Content Analytics Summary" from an external tool and verifying that the response contains a valid A2UI/AGUI payload that can be rendered by a compatible host.

**Acceptance Scenarios**:

1. **Given** a host tool supports A2UI, **When** the Hermes Agent returns a tool result, **Then** the payload should optionally include a visual representation using the "Alexandria" design system tokens.

---

### User Story 4 - Capability Discovery (Priority: P3)

As an external tool or agent, I want to automatically discover what Hermes Agents are available and what specific capabilities (tools) they offer.

**Why this priority**: Ensures the integration is dynamic and doesn't require hardcoding tools on the client side.

**Independent Test**: Can be tested by calling the MCP/A2A "list tools" endpoint and verifying it returns the current set of agent definitions.

**Acceptance Scenarios**:

1. **Given** new tools are added to the content-authoring-service, **When** an external tool queries the MCP server, **Then** the new tools should appear in the discovery list without manual configuration.

---

### Edge Cases

- **Authentication Failure**: How does the system handle an invalid or expired API key from an external AI tool? (Expected: Standard 401 Unauthorized or MCP Error).
- **Tenant Isolation**: Ensure that an MCP connection is strictly scoped to the tenant associated with the API key.
- **Long-Running Tasks**: How are timeouts handled when an agent takes a long time to generate content over an MCP transport?
- **Unsupported UI Rendering**: How does a host tool handle an A2UI payload if it only supports text? (Expected: Graceful degradation to a text summary).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST implement the Model Context Protocol (MCP) server specification within the `content-authoring-service`.
- **FR-002**: System MUST expose Hermes AI Agent capabilities as MCP "Tools".
- **FR-003**: System MUST authenticate external tool requests using an API Key.
- **FR-004**: System MUST support the Stdio transport protocol for MCP connections.
- **FR-005**: System MUST enforce tenant-level isolation for all external agent interactions based on the provided credentials.
- **FR-006**: System MUST provide a mechanism for external tools to list and discover available agents and their specialized domains.
- **FR-007**: System MUST support the A2UI (Agent-to-UI) standard for emitting interactive UI components.
- **FR-008**: System MUST provide Agent-Generated UI (AGUI) templates that adhere to the Alexandria Design System.

### Key Entities

- **MCP Tool**: A stateless wrapper around a Hermes Agent capability (e.g., "create-content", "search-knowledge-base").
- **Agent Context**: The state and history maintained during an A2A/MCP session to ensure coherent multi-turn conversations.
- **External Connection**: A validated session from a 3rd-party AI tool (Claude, ChatGPT, etc.).
- **A2UI Component**: A standardized, JSON-serializable representation of a UI element (e.g., a "Content Card" or "Data Table") emitted by the agent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing Hermes Agent tools are successfully mapped and callable via MCP.
- **SC-002**: Connection establishment for external AI tools takes less than 500ms.
- **SC-003**: External AI tools (Claude/ChatGPT) can successfully perform a multi-turn content creation workflow using only the Hermes MCP/A2A interface.
- **SC-004**: A2UI-enabled hosts can render at least 3 distinct "Alexandria" themed UI components emitted by the Hermes service.

## Assumptions

- **Existing Agent Logic**: We assume the core agent logic and tool implementations in `content-authoring-service` are already functional and only need "exposure".
- **External Support**: We assume the target tools (Claude Desktop, etc.) fully support the MCP/A2A specifications as they are released.
- **Network Accessibility**: We assume the `content-authoring-service` is reachable by the external tools (either via local stdio for desktop apps or public endpoints for cloud-based AI).
- **A2UI Host Support**: We assume the host application (e.g., a custom dashboard or future Claude capability) can interpret the A2UI JSON schema.
