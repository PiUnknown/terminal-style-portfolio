---
title: "Jev: What is a System One Model?"
date: "2026-09-21"
tags: "jev, ai, guide"
readTime: "5 min"
excerpt: "Jev is a new kind of AI model that makes decisions instead of writing text. What it is, why it is suddenly everywhere, and where to start."
---

## What is Jev?

**Jev** is a new class of decision-making AI model from TypeSafe AI. It does not engage in prose conversations or write text responses.

Instead, you provide:
- Input text to evaluate
- A list of structured, typed questions

It returns concise, deterministic answers:
- A probability score (yes/no)
- A selected choice from your predefined options
- A scalar position on a scale

The easiest way to think about Jev is as **a smart `if` statement**.

Traditional code branches on computable values (like `if (order.total > 100)`), but fails when condition evaluation requires subjective judgment:
- Is this incoming email about a billing dispute?
- How frustrated is this customer?

Jev evaluates the subjective judgment, allowing your software to branch cleanly on the result.


> **Key Takeaway:** Jev is built for high-speed, programmatic decisions inside software pipelines, not text conversations.


## Why is Jev trending?

- **Backing & Launch**: TypeSafe AI emerged from stealth on September 15, 2026, with $40M in seed funding.
- **System One Architecture**: Built specifically for ultra-fast software decisions rather than human chat.
- **Performance & Cost**: Most inference calls finish in **~100ms** at **$0.042 per million input tokens**, with free output.
- **Real-World Scale**: Early benchmarks saw developers classify 98,000 document listings in under ten minutes for under $0.10.


## How does Jev differ from structured LLM outputs?

While standard Large Language Models can produce structured JSON, they come with trade-offs:
- LLMs generate JSON token-by-token, introducing latency.
- Standard LLMs charge full conversational pricing.
- Generative models can occasionally drift outside your defined schema.

Jev samples all requested questions in parallel as probability distributions over your defined options. It is fast, cost-effective, and guaranteed to strictly adhere to your schema.


## How to try Jev

1. Join the waitlist at [typesafe.ai](https://typesafe.ai).
2. Generate an API key at [console.typesafe.ai/keys](https://console.typesafe.ai/keys).
3. Execute your first API request:

```bash
curl -s https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jev-latest",
    "state": "My card was charged twice for order A-104. Please refund the duplicate.",
    "questions": {
      "refund_requested": {
        "type": "noul",
        "instructions": "Does the customer ask for money back?"
      }
    }
  }'
```

Response output:

```json
{
  "refund_requested": {
    "type": "noul",
    "noul": 0.93
  }
}
```

The returned `0.93` represents the probability of a positive answer. You can directly branch on this value in code.


## The Three Question Primitives


### 1. Noul (Boolean Probability)

Returns a float between `0.0` and `1.0` representing the probability of `true`:
- Near `1.0`: Strong positive
- Near `0.0`: Strong negative
- `0.5`: High uncertainty

Use cases:
- Detecting sensitive personal information
- Identifying refund requests
- Checking candidate resume requirements


### 2. Choice (Categorical Selection)

Selects the best fit from a user-provided array of options and returns the probability distribution and confidence score.

Use cases:
- Routing support tickets (`billing`, `technical`, `account`)
- Classifying document categories
- Identifying programming languages


### 3. Score (Scalar Assessment)

Maps input onto a continuous numerical spectrum (e.g., `0` = calm, `1` = frustrated, `2` = hostile). Can return intermediate values like `1.4`.

Use cases:
- Assessing customer sentiment
- Rating bug severity
- Scoring technical proficiency


> **Key Takeaway:** Map your code logic directly to the right primitive: **Choice** maps to code branches, **Score** maps to numeric thresholds, and **Noul** maps directly to an `if` condition.


## Getting Started Resources

- **Playground**: [console.typesafe.ai/playground](https://console.typesafe.ai/playground)
- **Documentation**: [docs.typesafe.ai](https://docs.typesafe.ai)
- **SDKs**: `npm install @typesafe-ai/sdk` or `pip install typesafe-sdk`


> **First Project Advice:** Identify a task currently handled by complex regex or an overworked LLM prompt, and let Jev label, route, or score it instead.
