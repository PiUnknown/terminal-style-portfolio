---
title: "ML Fundamentals #3: Logistic Regression - Predicting Yes or No With a Probability"
date: "2026-10-04"
tags: "ml, fundamentals, guide"
readTime: "9 min"
excerpt: "How does a model answer yes or no instead of a number? Start with hours studied and exam results, then understand the sigmoid, log loss, and where the 0.5 cutoff comes from."
---

## What is logistic regression?

**Logistic regression predicts the probability that something is a yes, then turns that probability into a yes or no answer.**

This is lesson 3 of the Machine Learning Fundamentals series. It uses slope, intercept, loss, and gradient descent, explained in [lesson 2](https://www.piunknown.dev/blog/ml-fundamentals-2-linear-regression-fitting-the-best-straight-line). If those terms are new, give it a read first.

It answers questions with two possible outcomes:

- will this student pass or fail
- is this email spam or not spam
- will this customer cancel or stay

Despite the word "regression" in the name, it is a **classification** model: its final answer is a category, not a number. It is a `supervised learning` model, so every training example comes with the correct answer attached.

## Why not just use linear regression?

Because a straight line does not know the answer must stay between 0 and 1.

Say you code pass as 1 and fail as 0, then fit a straight line through the data.

- Far to the right, the line keeps climbing past 1. A "chance of passing" of 1.3 means nothing.
- Far to the left, it drops below 0. A chance of -0.2 means nothing either.
- A few extreme points can tilt the whole line and move where it crosses the middle.

You need a model whose output is always a valid probability. Logistic regression keeps the part of linear regression that works, a weighted sum of the inputs, and adds one step on top to squash it into the range 0 to 1.

## What does it look like with real students?

Picture a teacher with twelve students. For each one she knows the hours they studied and whether they passed.

- More hours usually means a pass, but not always.
- One student studied 3 hours and failed. One studied 2.5 hours and passed.
- No hard rule like "5 hours or more" separates every pass from every fail.

So instead of a rule, you ask for a **probability**: "after this many hours, how likely is a pass?"

Here are the twelve students (made-up numbers, for illustration) with the curve logistic regression fits through them:

![Twelve students as dots at 0 and 1 with a fitted S-shaped curve](/assets/logistic-fit.png)

- Green dots are the students. The ones on the top row passed (1), the ones on the bottom row failed (0).
- The white curve is the model's probability of passing for any number of hours.
- The dashed amber line marks 0.5, the point where pass and fail are equally likely.

Notice the shape. It is flat near 0, rises through the middle, and flattens near 1. It never leaves the range 0 to 1.

## What is the curve actually made of?

Two steps.

### Step 1: a score from a straight line

The model first computes a plain weighted sum, a **score**:

- score = slope times hours, plus an intercept

This is the same slope-and-intercept line as before. The score can be any number: negative, zero, or huge. In the model above, the fitted slope is about 1.41 and the intercept about -4.56.

### Step 2: the sigmoid squashes it into a probability

The **sigmoid** (also called the logistic function) turns any score into a number between 0 and 1.

![The sigmoid curve: score on the bottom, output from 0 to 1 on the side](/assets/logistic-sigmoid.png)

- A very negative score gives a probability close to 0.
- A score of exactly 0 gives exactly 0.5.
- A very positive score gives a probability close to 1.

The formula is 1 divided by (1 plus e to the power of minus the score). You do not need to memorize it. What matters is the behavior: any number in, a valid probability out.

### Worked example

Take the fitted model above.

- A student who studied 1 hour has a score of about -3.16, which the sigmoid turns into roughly a 4% chance of passing.
- A student who studied 3 hours has a score of about -0.35, roughly a 41% chance.
- A student who studied 5 hours has a score of about 2.47, roughly a 92% chance.

(These come from running the fit on the twelve made-up students above.)

## How does a probability become a yes or no?

With a **threshold**. The usual default is 0.5.

- Probability of 0.5 or more: predict yes (pass).
- Probability below 0.5: predict no (fail).

For this model, the probability crosses 0.5 at about 3.25 hours. That point is the **decision boundary**: everything on one side is predicted pass, everything on the other is predicted fail.

### Do you have to use 0.5?

No. 0.5 is a default, not a law, and it is a setting you choose.

- If missing a real case is costly, such as a disease screening, lower the threshold so the model says yes more easily.
- If a false alarm is costly, such as marking a real email as spam, raise it so the model says yes only when it is very sure.

The model produces the probability. You decide how sure it must be before acting on it.

## What does "best" mean here?

In linear regression, "best" meant lowest mean squared error. Here the model needs a different loss function, because the answers are categories and the output is a probability.

It is called **log loss** (or cross-entropy). Start with the idea before the formula.

- The model should be **confident when it is right** and **punished hard when it is confidently wrong**.

Worked example, for a student who really passed:

- The model said 90% pass. The loss is about 0.11. Small.
- The model said 50% pass. The loss is about 0.69. Medium.
- The model said 10% pass. The loss is about 2.30. Large.

The more confidently wrong the prediction, the faster the penalty grows. For a student who really failed, the same logic applies in reverse.

### What is the formal definition?

**Log loss** is the average, across all examples, of the negative log of the probability the model gave to the correct answer.

Take it in steps:

1. For each example, find the probability the model gave to what actually happened.
2. Take the negative log of it. A probability near 1 gives a loss near 0, and a probability near 0 gives a huge loss.
3. Average across all examples.

### Why not reuse mean squared error?

- With the sigmoid in the mix, squared error produces a bumpy loss surface with flat patches that make gradient descent slow or stuck.
- Log loss gives a smooth bowl with one bottom, so the search reliably finds the best answer.
- It also punishes confident mistakes much harder, which is exactly the behavior you want from a probability model.

## How does the model find the best curve?

The same way as linear regression: **gradient descent**. Nothing about the search changes, only the loss it measures.

1. Start with a rough guess for the slope and intercept.
2. Compute the probabilities and the log loss.
3. Nudge the slope and intercept in the direction that shrinks the loss.
4. Repeat until the loss stops shrinking.

Here is the loss across iterations, from running gradient descent on the twelve students above:

![Log loss against iteration: a fast drop, then a flat tail](/assets/logistic-loss-curve.png)

- It starts at about 0.69, which is what a model that says 50% for everyone scores.
- Early steps cut the loss quickly.
- Later steps barely change it. Training is done.

The **learning rate** still works the same way: too high overshoots, too low crawls.

## How do you do it in code?

With scikit-learn, a Python machine learning library:

    from sklearn.linear_model import LogisticRegression

    model = LogisticRegression()
    model.fit(X_train, y_train)

    print(model.coef_, model.intercept_)
    probabilities = model.predict_proba(X_test)
    labels = model.predict(X_test)

Read it line by line:

- `X_train` holds the inputs (hours studied) and `y_train` the correct answers (0 or 1) the model learns from. `X_test` is inputs it has not seen.
- `LogisticRegression()` creates the model.
- `fit(...)` finds the best slopes and intercept from the training data.
- `predict_proba(...)` returns the probability for each class.
- `predict(...)` applies the 0.5 threshold and returns the yes or no labels.

This is the same fit-then-predict loop as before.

## How do you know if the model is any good?

R-squared does not apply here. Start with the simplest check.

- **Accuracy** is the share of predictions that were correct. 9 correct out of 10 is 90%.

Accuracy alone can mislead. If 95 out of 100 emails are not spam, a model that always says "not spam" scores 95% and catches nothing.

So look at the two kinds of mistake separately:

- **Precision**: when the model says yes, how often is it right?
- **Recall**: of all the real yeses, how many did the model find?

Raising the threshold usually improves precision and lowers recall. Lowering it does the reverse.

And as always, check on **held-out examples**. A model can score well on the data it trained on and still fail on new data.

## Where does logistic regression break?

It draws one smooth boundary, and only a straight one.

### What if the classes are not separable by a straight boundary?

If one class sits in a ring around the other, no straight boundary can split them. The model will systematically miss. Fixes exist, such as adding extra input terms or using other models. Later lessons cover them.

### What about more than two outcomes?

The same idea extends to several categories, for example spam, promotion, or personal mail. The basic version in this lesson handles two.

### Other common mistakes

- trusting accuracy alone when one class is much rarer than the other
- keeping the 0.5 threshold without asking what each kind of mistake costs
- reading a probability as a guarantee: 90% still means 1 in 10 is wrong
- treating a large coefficient as proof of cause and effect
- checking only on training data

## Can you explain the idea back?

Try answering these before moving on:

- **Why not use linear regression for yes or no answers?** A line can output values below 0 or above 1, which are not valid probabilities.
- **What does the sigmoid do?** It squashes any score into a number between 0 and 1.
- **How does a probability become a yes or no?** By comparing it to a threshold, 0.5 by default, which you can move depending on which mistake costs more.
- **Why log loss instead of squared error?** It punishes confident wrong answers much harder and gives gradient descent a smooth bowl to roll down.

If those answers make sense, the main idea is in place.

## Where should you go next?

Try it by hand first. Pick a yes or no outcome you track, like whether you finished your task list on a given day.

- Note the hours you slept the night before for five or six days.
- Mark each day 1 for done or 0 for not done.
- Look for the sleep value where the answers flip from mostly 0 to mostly 1. That is your decision boundary, found by eye.

Then go deeper:

- [Logistic regression (Wikipedia)](https://en.wikipedia.org/wiki/Logistic_regression) - for the full math
- [Logistic regression (ML Visualized)](https://ml-visualized.com/chapter3/logistic_regression.html) - for how the search works
- [scikit-learn: Linear Models](https://scikit-learn.org/stable/modules/linear_model.html) - for the code you used above, under the logistic regression section
- [MLU Explain: Logistic regression](https://mlu-explain.github.io/logistic-regression/) - for a visual walkthrough

A probability is just a line squashed into a range. The loop underneath is the same: guess, measure the error, adjust.

### until the next one, keep noticing patterns.
