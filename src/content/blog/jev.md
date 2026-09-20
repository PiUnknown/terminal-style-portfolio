---
title: "Jev: What is a System One Model?"
date: "2026-09-21"
tags: "jev, ai, guide"
readTime: "5 min"
excerpt: "Jev is a new kind of AI model that makes decisions instead of writing text. What it is, why it is suddenly everywhere, and where to start."
---

## What is Jev?

Jev is a new AI model from TypeSafe AI, and it does not chat.

- You send it text plus a list of typed questions.
- It sends back one answer per question: a yes/no probability, a pick from your options, or a position on your scale.
- No prose, ever.

The easiest way to think about it: **a smart if statement**.

Code branches on what it can compute, like `if (order.total > 100)`. It falls apart when the condition is a judgment. Is this email about billing? How angry is this customer? Jev answers the judgment. Your code keeps the branch.

## Why is it suddenly trending?

- TypeSafe came out of stealth on **September 15, 2026** with **$40M in seed funding** and Jev as its first public model.
- It is calling this a new class: a **System One model**, built to make fast decisions inside software instead of talking to people.
- The numbers: most calls finish in **~100ms**, input costs **$0.042 per million tokens**, and output is free.
- In the first days people labeled 1,018 research papers for $0.08, classified 98,000 listings in ten minutes, and wired it into browser agents and game bots that decide several times a second.

## How is it different from an LLM with structured output?

An LLM can do this, but slowly and at LLM prices. It generates its JSON one token at a time. Jev samples all answers in parallel as probability distributions over options you defined. That is why it is fast, cheap, and unable to return a value outside your schema.

## How do you try it?

1. Join the waitlist at [typesafe.ai](https://typesafe.ai). Early signups reported getting in within a day or two.
2. Grab an API key at [console.typesafe.ai/keys](https://console.typesafe.ai/keys).
3. Make your first call:

Run: curl -s https://api.typesafe.ai/v1/systemone -H "Authorization: Bearer $TYPESAFE_API_KEY" -H "Content-Type: application/json" -d '{"model":"jev-latest","state":"My card was charged twice for order A-104. Please refund the duplicate.","questions":{"refund_requested":{"type":"noul","instructions":"Does the customer ask for money back?"}}}'

You get back something like:

    {"refund_requested": {"type": "noul", "noul": 0.93}}

That number is the probability of yes. Branch on it like any other value.

## The three question types

- **Noul** - is this true.
- **Choice** - which of these options.
- **Score** - where on a scale you describe.

Ask several questions in one call; they all run in parallel. SDKs too: `npm install @typesafe-ai/sdk`, or `pip install typesafe-sdk`.

## Where to start

- **Playground** - [console.typesafe.ai/playground](https://console.typesafe.ai/playground): paste text, try questions, no code.
- **Docs** - [docs.typesafe.ai](https://docs.typesafe.ai): short and good.
- **Deep dive** - [flaviocopes.com/jev](https://flaviocopes.com/jev): the best long read.
- **Coding agents** - [github.com/typesafe-ai/skills](https://github.com/typesafe-ai/skills): the official skill, so your agent stops treating Jev like a chat model.

## My advice for a first project

Find something you currently handle with a pile of regex or an overworked prompt, and let Jev label, route, or score it instead. That is the whole trick.
