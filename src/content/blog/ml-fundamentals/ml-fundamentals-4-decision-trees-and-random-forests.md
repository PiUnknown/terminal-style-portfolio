---
title: "ML Fundamentals #4: Decision Trees and Random Forests - A Flowchart, Then a Crowd of Flowcharts"
date: "2026-10-12"
published: true
series: "ML Fundamentals"
order: 4
tags: "ml, fundamentals, notes"
readTime: "11 min"
excerpt: "What if a model could explain itself as a simple flowchart of yes/no questions? Start with a restaurant decision, then see how a crowd of slightly different trees combines its predictions."
---

## What is a decision tree?

**A decision tree makes a prediction by following a flowchart of questions until it reaches an answer.**

This is lesson 4 of the Machine Learning Fundamentals series. It uses terms like classification, training examples, and labels, covered in [lesson 3](https://www.piunknown.dev/blog/ml-fundamentals-3-logistic-regression-predicting-yes-or-no). If those terms are new, give it a read first.

Think about how you might decide whether to eat at a new restaurant:

- Is it raining?
- If yes, is there a covered patio?
- If no, do the reviews mention long waits?

Each answer sends you down a different branch until you land on "eat here" or "skip it." That is a decision tree: one path of questions leading to one answer.

<div data-blog-animation="decision-tree"><img src="/assets/decision-tree-poster.svg" alt="Rain: yes. Covered patio: no. The selected path ends at Skip it."></div>

- The boxes are questions or final answers.
- The yes/no labels tell you which branch to follow.
- The moving point is one example: it is raining, and there is no covered patio.
- The highlighted path ends at "skip it." The other branches exist, but this example does not visit them.

This is a made-up restaurant example to show the idea, not a tree trained on restaurant data. A learning algorithm chooses its questions from examples instead of having you write the whole flowchart by hand.

## Why do we need decision trees?

**A small tree makes a prediction through steps a person can follow.**

Instead of reading a collection of weights, you can trace the questions that led to an answer.

- Each question tests an input, such as rain or a covered patio.
- Each answer selects the next branch.
- One path explains how the tree reached one prediction.

That readability is useful when someone needs to understand a decision, such as a loan approval. But readability alone does not make a model reliable: an unrestricted tree can memorize the training examples. A random forest tackles that problem by combining several trees, at the cost of a less readable overall model.

## What is a tree actually made of?

**A tree has question nodes, branches for the answers, and leaves for the final predictions.**

### What is a split?

A **split** divides examples into groups using a question about an input.

- "Is it raining?" divides the restaurant examples by weather.
- "Is age over 30?" is an illustrative question about a number.
- The first question is at the **root**. Further questions appear below it.

A question node is a point where the path can branch. The learning algorithm chooses which question to put there.

### What is a leaf?

A **leaf** is a node with no further questions.

- In the restaurant example, "eat here" and "skip it" are leaves.
- A new example follows the questions until it reaches one of them.
- The leaf supplies the prediction for that example.

You can read a small tree like a checklist: answer the current question, follow its branch, then repeat until you reach a leaf.

## How does a decision tree learn?

**It repeatedly chooses splits that make the resulting groups less mixed.**

The restaurant flowchart was written by hand. A trained tree uses examples with known outcomes to choose its questions.

### What does one split do?

Imagine restaurant examples labelled "eat here" or "skip it." This is still an illustration, not a measured dataset.

- Before a split, the examples may contain both outcomes.
- A useful question sends more "eat here" examples to one side and more "skip it" examples to the other.
- A **pure** group contains only one outcome. A less mixed group is closer to that goal.

The tree does not stop after choosing its first question. It tries further questions inside each resulting group.

### What is the training sequence?

1. Start with the labelled training examples.
2. Try candidate questions about the inputs.
3. Score how well each question separates the outcomes.
4. Choose a split and repeat within the resulting groups.
5. Stop according to the tree's limits, leaving predictions at the leaves.

A deeper tree can make more detailed rules. Whether those details are useful or just memorized noise is a separate question.

## What does "best" mean here?

**A good split reduces how mixed the outcomes are, measured with an impurity score.**

Start with the idea before the formula: a group containing only "eat here" examples is easier to predict than a group containing both answers.

### What is Gini impurity?

**Gini impurity** measures how mixed the classes are inside a group.

- A score of 0 means every example belongs to the same class.
- For two classes, the highest value is 0.5, when they are equally represented.
- A split is useful when its resulting groups have lower impurity overall.

The 0.5 upper limit applies to the two-class case used here, not to every possible classification problem.

### What is information gain?

**Entropy** measures uncertainty about the outcome. **Information gain** measures how much a split reduces it.

- Lower entropy means less uncertainty inside a group.
- Higher information gain means the split removed more uncertainty.
- Gini impurity and entropy are different scores for a similar goal: separating outcomes into less mixed groups.

They often lead to similar trees. Do not assume that choosing one instead of the other automatically produces a radically different model.

## Why does a single tree overfit?

**An unrestricted tree can learn rules so specific that it memorizes the training examples.**

It keeps carving the data into smaller groups, including groups shaped by noise rather than a pattern that will repeat.

- Training predictions can look excellent.
- New examples may not fit those very specific rules.
- Good training performance alone does not prove the tree learned something reusable.

### How do you hold a tree back?

Two limits help keep its rules from becoming too specific:

- **Maximum depth** limits how many levels of questions the tree can have.
- **Minimum samples per leaf** requires a leaf to contain enough training examples instead of being built around a tiny group.

These limits control the model's complexity. They are settings you choose, not guarantees that every future prediction will be correct.

## What is a random forest?

**A random forest combines predictions from many trees built with different random samples and feature choices.**

Back to the restaurant. Imagine asking twenty friends, each weighing the clues a little differently, then combining their answers instead of relying on one friend's judgment. That is an analogy, not a claim that a trained forest behaves exactly like people.

### How do the trees end up different?

A forest introduces two kinds of randomness:

- **Bootstrapping**: each tree gets rows sampled from the training data with replacement.
- **Random feature subsets**: at each split, the tree considers only a random subset of the available inputs.

Different samples and candidate inputs help the trees avoid all learning exactly the same rules.

### What does "with replacement" mean?

A sampled row remains available to be drawn again.

- Some rows can appear more than once in one tree's training sample.
- Other rows may be absent from that sample.
- Another tree gets a different sample from the same original data.

### How do the answers combine?

The trees contribute to a combined prediction.

- For categories, the forest combines the trees' support for the possible answers.
- For numeric predictions, tree outputs can be averaged.
- Training on bootstrapped samples and combining predictions is called **bagging**.

Combining varied trees can reduce the effect of any one tree's noisy rules. It does not make bad training data or incorrect predictions disappear.

## How is a forest different from one tree?

**A forest trades the simplicity of one readable path for predictions combined across many trees.**

### Single tree

- Easy to draw and trace when it is small.
- One set of questions learned from the data.
- Prone to learning overly specific rules if left unrestricted.

### Random forest

- Many trees trained on bootstrapped samples.
- Random subsets of inputs considered at each split.
- Predictions combined rather than taken from one tree alone.
- Harder to explain by drawing one flowchart.

## What is feature importance?

**Feature importance summarizes how much each input contributed to reducing impurity across the forest.**

It gives a way to inspect the forest even when reading every tree is impractical.

- An input used in helpful splits can receive a higher importance score.
- The scores summarize contributions across the trees.
- They describe the fitted model, not proof that an input causes an outcome.

A forest can be useful without being as easy to trace as a single small tree. Feature importance is one summary, not a replacement for checking its predictions.

## How do you do it in code?

**Create a forest, fit it on labelled examples, then predict for inputs it has not trained on.**

With scikit-learn, a Python machine learning library:

    from sklearn.ensemble import RandomForestClassifier

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

Read it line by line:

- `X_train` holds the inputs and `y_train` holds their correct class labels. `X_test` contains inputs reserved for checking predictions.
- `RandomForestClassifier(...)` creates a forest for category predictions.
- `n_estimators=100` asks it to build 100 trees, matching the lesson's example.
- `random_state=42` fixes the random seed so the same setup can be repeated.
- `fit(...)` trains the trees using the training examples.
- `predict(...)` combines their predictions for the test inputs.

The data variables need to be prepared first. This is the fit-then-predict pattern, with several trees inside the model instead of one line or curve.

## How do you know if the model is any good?

**Check its predictions on examples that were not used to train it.**

A readable path or a large forest is not evidence of generalization on its own.

- Keep training examples separate from the examples used to check performance.
- Compare predicted labels with the real outcomes.
- Do not trust excellent training results if new examples expose mistakes.

The point of limiting a tree or combining trees is to learn rules that transfer, not just to improve the score on examples the model has already seen.

## Where do trees and forests go wrong?

**They can still learn noise, and a forest's extra trees make its reasoning harder to inspect.**

### Common mistakes

- Letting one tree grow without limits, then treating its training score as proof it works.
- Assuming a forest is as easy to explain as one small tree.
- Ignoring feature importance when trying to inspect a forest, or treating it as proof of cause and effect.
- Forgetting that random samples can change results between runs unless you fix the seed.
- Assuming Gini impurity and information gain must produce wildly different trees.
- Checking only on the training examples.

More trees do not remove the need to check the model on new data.

## Can you explain the idea back?

**You should be able to explain the questions, the learning process, and why several trees can help.**

Try answering these before moving on:

- **What does a decision tree do?** It follows a chain of questions until an example reaches a leaf with a prediction.
- **How does it choose a split?** It tries candidate questions and scores how well they reduce mixed outcomes.
- **Why does one tree overfit?** Without limits, it can learn rules specific to the training examples, including their noise.
- **How does a forest reduce that problem?** It combines varied trees trained with bootstrapped rows and random feature choices, reducing reliance on one tree's rules.
- **What is the trade-off?** A forest is harder to trace than one small tree, though feature importance can summarize input contributions.

If those answers make sense, the main idea is in place.

## Where should you go next?

**Try tracing a tree by hand, then use the resources to study how an algorithm learns one.**

Pick a decision you make each day, like whether to go for a run.

- Write down the yes/no questions you would ask: weather, energy, or whether you already exercised.
- Arrange them as a flowchart ending in "run" or "skip."
- Choose one made-up situation and follow only the branch matching each answer.

You have built a tree by hand. Training a tree means choosing those questions from examples rather than writing them yourself.

Then go deeper:

- [Decision Trees (MLU-Explain)](https://mlu-explain.github.io/decision-tree/) - a visual, scroll-through walkthrough of how a tree picks its splits
- [Random Forest (MLU-Explain)](https://mlu-explain.github.io/random-forest/) - a visual walkthrough of bootstrapping, random feature choices and combined predictions
- [Decision tree learning (Wikipedia)](https://en.wikipedia.org/wiki/Decision_tree_learning) - for splits, impurity and the tree-learning process
- [Random forest (Wikipedia)](https://en.wikipedia.org/wiki/Random_forest) - for bootstrapping, random feature choices and combined predictions
- [scikit-learn: Decision Trees](https://scikit-learn.org/stable/modules/tree.html) - for training a tree and controlling its depth and leaf size

One tree follows a path. A forest combines many paths. Both still have to work on the next example, not just the ones they learned from.

### until the next one, keep noticing patterns.
