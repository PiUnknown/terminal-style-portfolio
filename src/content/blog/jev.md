---
title: "Jev: What is a System One Model?"
date: "2026-09-21"
tags: "jev, ai, guide"
readTime: "5 min"
excerpt: "Jev is a new kind of AI model that makes decisions instead of writing text. What it is, why it is suddenly everywhere, and where to start."
---

## What is Jev?

Jev is a new AI model from TypeSafe AI. It does not chat.

You send it:

- some text
- a list of typed questions

It sends back one answer per question:

- a yes/no probability
- a pick from your options
- a position on your scale

No prose, ever.

The easiest way to think about it: **a smart if statement**.

Code branches on what it can compute, like `if (order.total > 100)`. It falls apart when the condition is a judgment.

- Is this email about billing?
- How angry is this customer?

Jev answers the judgment. Your code keeps the branch.

## Why is it suddenly trending?

- TypeSafe came out of stealth on **September 15, 2026** with **$40M in seed funding**.
- Jev is its first public model, and it calls it a new class: a **System One model** - fast decisions inside software, not conversations with people.
- Most calls finish in **~100ms**. Input costs **$0.042 per million tokens**. Output is free.
- In the first days, people labeled 1,018 research papers for $0.08 and classified 98,000 listings in ten minutes.

## How is it different from an LLM with structured output?

An LLM can answer these questions too. But:

- it generates its JSON one token at a time - slow
- it charges LLM prices for it
- it can drift outside your format

Jev samples all answers in parallel, as probability distributions over options you defined. Fast, cheap, and unable to return a value outside your schema.

## How do you try it?

1. Join the waitlist at [typesafe.ai](https://typesafe.ai). Early signups got in within a day or two.
2. Grab an API key at [console.typesafe.ai/keys](https://console.typesafe.ai/keys).
3. Make your first call:

Run: curl -s https://api.typesafe.ai/v1/systemone -H "Authorization: Bearer $TYPESAFE_API_KEY" -H "Content-Type: application/json" -d '{"model":"jev-latest","state":"My card was charged twice for order A-104. Please refund the duplicate.","questions":{"refund_requested":{"type":"noul","instructions":"Does the customer ask for money back?"}}}'

You get back:

    {"refund_requested": {"type": "noul", "noul": 0.93}}

That number is the probability of yes. Branch on it like any other value.

## The three question types

### Noul - is this true?

Returns one number between 0 and 1: the probability of yes.

- near 1: strong yes
- near 0: strong no
- 0.5: genuinely unsure

Use it when the probability itself is the signal:

- does this message contain personal info?
- is the customer asking for a refund?
- does this resume mention distributed systems?

One trap: define the condition precisely. "Is this candidate strong in Python?" is vague - a 0.5 there means your question was unclear, not that the candidate is medium-skilled. Better: "Does the resume say the candidate used Python at work?" If you want a skill level, that is a Score, not a Noul.

### Choice - which of these options?

You give the full list of options. You get back:

- the selected option
- the probability of every option
- a confidence score for how peaked that distribution is

Use it when the answer is one of a known set with no order:

- routing a ticket: billing, technical, or account
- classifying a document type
- detecting a programming language

Add an `other` option when your list might not cover every input.

### Score - where on this scale?

You define the levels: 0 = calm, 1 = frustrated, 2 = very frustrated. You get back a position along them - it can even fall between two levels, like 1.4.

Use it when the answer lives on a spectrum:

- bug severity
- customer frustration
- skill level

### Picking between them

Ask what your code does with the answer:

- a Choice maps onto code paths
- a Score maps onto a threshold
- a Noul maps onto an `if`

You can mix all three in one call: same text, three questions, all answered in parallel.

Deeper docs: [noul](https://docs.typesafe.ai/primitives/noul) - [choice](https://docs.typesafe.ai/primitives/choice) - [score](https://docs.typesafe.ai/primitives/score)

SDKs: `npm install @typesafe-ai/sdk` or `pip install typesafe-sdk`

## Where to start

- **Playground** - [console.typesafe.ai/playground](https://console.typesafe.ai/playground): paste text, try questions, no code
- **Docs** - [docs.typesafe.ai](https://docs.typesafe.ai): short and good
- **Deep dive** - [flaviocopes.com/jev](https://flaviocopes.com/jev): the best long read
- **Coding agents** - [github.com/typesafe-ai/skills](https://github.com/typesafe-ai/skills): the official skill, so your agent stops treating Jev like a chat model

## My advice for a first project

Find something you currently handle with a pile of regex or an overworked prompt, and let Jev label, route, or score it instead. 
That is the whole trick.
