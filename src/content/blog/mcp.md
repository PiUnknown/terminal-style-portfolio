---
title: "MCP: The Protocol Behind AI Tools"
date: "2026-09-29"
tags: "mcp, ai, guide"
readTime: "3 min"
excerpt: "MCP is how AI apps connect to your tools and data. What it actually is, how it differs from an API, and where to start."
---

## What is MCP?

`MCP (Model Context Protocol)` **is an open standard** for connecting AI apps to external tools and data.

It does not make the model smarter. It gives the app a common way to discover and use capabilities.

### Three pieces:

- **Host** - the AI app that manages connections.
- **Client** - the part of that app wired to one server.
- **Server** - the program exposing capabilities, local or remote.

### A server can expose:

- **Tools** - actions, like `search_orders(id)`
- **Resources** - data the app can read, like a database schema
- **Prompts** - reusable templates for a task

The model never calls your database directly. The host decides what to expose and handles every tool request.

## Why is everyone adopting it?

- one server can describe its capabilities to any MCP-compatible host
- a host can connect to many servers without custom discovery logic per tool
- the same pattern covers actions, read-only context, and reusable prompts

It is useful interoperability, not magic portability:

- the host must support your capabilities and transport
- every integration still needs credentials and careful permissions

## How is it different from an API?

An API is how two pieces of code talk. You read its docs, write glue code for its specific URLs, params, and auth - and every API is different.

MCP is one fixed way for an AI app to ask any tool two things:

- what can you do?
- do this for me

The easiest way to think about it: **USB-C for AI apps**.

- an API is every device having its own charging plug - works fine, but you need the right cable for each one
- MCP is the shared port - plug in any MCP server and the AI app instantly knows what it can do and how to call it, no new glue code

They are not rivals. Most MCP servers call regular APIs behind the scenes - MCP just standardizes how the AI app on the other end discovers and uses them.

## What happens when a tool runs?

1. **you ask** - "refund order A-104"
2. **model proposes** - run `refund(order_id="A-104")`
3. **host approves** - and executes the call
4. **server runs** - the action, returns the result
5. **model reads it** - and answers you in plain words

The important part: the model only *proposes*. The host - code you control - sits in the middle, decides what gets executed, and can demand approval first.

Underneath, MCP messages are JSON-RPC. A local server speaks over standard input/output; a remote one uses Streamable HTTP.

## When should you skip it?

If one app calls one known endpoint, a plain API client is simpler.

Add MCP when AI apps need to discover and use that capability through the same interface as every other tool.

## How can you get started?

- **Overview** - [modelcontextprotocol.io intro](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro)
- **Architecture** - [modelcontextprotocol.io/learn/architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)
- **Build your first server** - [modelcontextprotocol.io/docs/develop/build-server](https://modelcontextprotocol.io/docs/develop/build-server)
- **Python SDK** - [github.com/modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk)

## My advice for a first project

Wrap something you already have - a database query, an internal API - as one MCP tool, and watch your agent discover and call it.

That is the whole trick.
