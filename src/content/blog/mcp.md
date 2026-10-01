---
title: "MCP: The Protocol Behind AI Tools"
date: "2026-09-29"
tags: "mcp, ai, guide"
readTime: "3 min"
excerpt: "MCP is how AI apps connect to your tools and data. What it actually is, how it differs from an API, and where to start."
---

## What is MCP?

**Model Context Protocol (MCP)** is an open standard for securely connecting AI applications to external tools, data sources, and workflows.

It does not make the underlying AI model smarter. Instead, it provides a standardized protocol for AI applications to dynamically discover and invoke capabilities.


### Core Architecture

- **Host**: The main AI application that manages connections and user interactions.
- **Client**: The component inside the host app connected to a specific server.
- **Server**: The program exposing capabilities, hosted locally or remotely.


### Server Capabilities

- **Tools**: Executable actions the model can trigger (e.g., `search_orders(id)`).
- **Resources**: Readable data contexts provided to the model (e.g., database schemas, logs).
- **Prompts**: Pre-configured prompt templates for specific tasks.


> **Key Takeaway:** The AI model never accesses external systems directly. **The host application sits in the middle**, managing security, permissions, and tool invocation approval.


## Why is MCP being widely adopted?

- **Universal Interface**: A single MCP server can expose its features to any MCP-compatible host without custom integration code.
- **Unified Capabilities**: Combines tool actions, read-only resource context, and reusable prompt templates into one standard.
- **Zero Glue Code**: Hosts seamlessly discover server capabilities at runtime.


## How is MCP different from a standard API?

A standard REST API defines how two specific applications communicate. Developers must read documentation, write custom glue code, and handle unique authentication formats for every API.

MCP provides a universal protocol for AI applications to query any system:
1. *What capabilities do you support?*
2. *Execute this specific tool with these arguments.*

Think of MCP as **USB-C for AI applications**:
- Standard APIs are like proprietary charging cables—functional, but requiring a unique cable for every device.
- MCP is the standardized USB-C port—plug in any MCP server, and the AI host immediately recognizes how to interact with it.


> **Key Takeaway:** MCP does not replace traditional APIs. Most MCP servers call underlying REST or GraphQL APIs behind the scenes—MCP simply standardizes discovery and execution for AI hosts.


## How a Tool Request Executes

1. **User Request**: You ask the AI host: *"Refund order A-104"*.
2. **Model Proposal**: The model requests to run `refund(order_id="A-104")`.
3. **Host Approval**: The host validates the request and obtains user approval.
4. **Server Execution**: The MCP server executes the backend action and returns the result.
5. **Final Response**: The model interprets the result and responds in plain language.


## Getting Started

- **Official Website**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Architecture Guide**: [modelcontextprotocol.io/learn/architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)
- **Python SDK**: [github.com/modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk)


> **First Project Advice:** Wrap an existing internal query or API endpoint into a single MCP tool, and test how your AI agent discovers and executes it.
