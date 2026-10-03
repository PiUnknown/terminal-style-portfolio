---
title: "ML Fundamentals #2: Linear Regression - Fitting the Best Straight Line Through Your Data"
date: "2026-10-03"
series: "ML Fundamentals"
order: 2
tags: "ml, fundamentals, guide"
readTime: "11 min"
excerpt: "How does a computer draw the best straight line through messy data? Start with runners and shoe sizes, then understand squared error, gradient descent, and where a straight line breaks."
---

## What is linear regression?

**Linear regression** finds the straight line that gets closest to all your data points at once.

This is lesson 2 of 11 in Machine Learning Fundamentals. Lesson 1 covered what a model is and what training means. Here we build the first real model.

It is used when you want to predict a **number** from other numbers you already know:

- a house price from its size
- a shoe size from a height
- tomorrow's sales from today's ad spend

It is a supervised learning model: every training example comes with the correct answer attached.


## Why do we need it?

**Guessing by eye does not scale.**


### Why Eyeballing Fails

- With five points, you can eyeball a trend line. With five thousand, you cannot.
- Two people eyeballing the same data draw two different lines. It is not repeatable.
- You need one rule that balances every point at once, not one that chases whichever point you looked at last.

Linear regression gives you that rule, and a precise definition of "best".


> **Key Takeaway:** Eyeballing is neither scalable nor repeatable. **Linear regression replaces guesswork with one rule and a precise definition of "best".**


## What does it look like with real people?

Picture a coach lining up ten runners and trying to guess each one's shoe size just by looking at them.


### The Runner Example

- Taller usually means bigger feet, but not always.
- One tall runner has small feet. One short runner has big feet.
- No single rule gets all ten exactly right.

So you draw one straight rule on a chart: "shoe size is roughly height times some number, plus a little extra."

You pick the line that keeps your **total guessing error** as small as possible across all ten runners. That line is linear regression.


> **Key Takeaway:** Real data is noisy and no rule is exact. **Linear regression picks the single line that minimizes total error across every example.**


## What is the line actually made of?

**Two kinds of numbers, the same ones from school algebra.**


### Slope and Intercept

- The **slope** says how much the output changes for each one-unit increase in the input.
- The **intercept** is where the line starts when the input is zero. It is a fixed baseline that does not depend on the input.

In the runner example:

- slope: extra shoe size per extra centimeter of height
- intercept: the baseline shoe size the line starts from

A steeper slope means a stronger effect. A negative slope means the output falls as the input rises.


### What if there are several inputs?

You get one slope per input. These are called **coefficients**.

- Height and age together might predict shoe size better than height alone.
- With one input, the model fits a line. With two, a flat sheet. With more, a flat surface called a **hyperplane**.
- You cannot picture it past three dimensions, but the idea is the same.

Each coefficient says how much the output changes for a one-unit change in that input, **holding every other input fixed**.

This is what makes linear regression explainable. You can read the coefficients and say exactly why it predicted what it did.


> **Key Takeaway:** A line is just slope and intercept. **With several inputs you get one coefficient per input, which keeps the model explainable.**


## What does "best" mean?

**The line that minimizes the total squared distance between the line and every actual data point.**

Take it in steps:

1. For each point, measure the gap between the line's prediction and the real value. That gap is the error.
2. Square each gap.
3. Average them.

That average is the **mean squared error**, and it is the model's **loss function**: the single number that says how wrong the line currently is.


### Why square the gaps?

- Squaring makes every error positive, so misses above and below the line cannot cancel out.
- Squaring punishes big misses far more than small ones. A miss of 4 costs 16, not 4.
- So the line does not swing wildly to please one stubborn point.

A truly extreme outlier can still drag the line noticeably. Squaring reduces that, it does not remove it.


> **Key Takeaway:** Squaring keeps errors positive and punishes big misses. **The mean squared error gives you one number that says how wrong the line is.**


## How does the model find the best line?

**By searching. Training is a loop, most commonly gradient descent.**

1. Scatter the points: your raw data.
2. Try a line: start from a rough guess for the slope and intercept.
3. Measure the error: the mean squared error of that guess.
4. Adjust: nudge the slope and intercept in the direction that shrinks the error.
5. Repeat until the error stops shrinking.

Think of walking downhill in fog. You cannot see the valley, but you can feel which way the ground slopes under your feet. Take a step that way, then feel again.

On a chart of error against iteration, the curve drops fast at first, then flattens. Flat means further nudging no longer helps.


### What is the learning rate?

The **learning rate** controls how big each step is.

- Too high: the model overshoots the best fit and bounces around without settling.
- Too low: it creeps toward the best fit and training takes far longer.

It is a setting you choose, not something the model learns.


> **Key Takeaway:** Training is a loop of guess, measure, adjust. **The learning rate controls step size, and it is a setting you choose, not something the model learns.**


## How do you do it in code?

**With scikit-learn, a Python machine learning library:**

```python
from sklearn.linear_model import LinearRegression

# X = input numbers for each example, y = the number to predict
model = LinearRegression()
model.fit(X_train, y_train)

print(model.coef_, model.intercept_)
predictions = model.predict(X_test)
```


### Method Breakdown

- `LinearRegression()` creates the model.
- `fit(...)` finds the best slopes and intercept from the training data.
- `coef_` holds the learned slopes. `intercept_` holds the baseline.
- `predict(...)` turns new inputs into predicted numbers.

This is the same fit-then-predict loop from lesson 1. The data variables need to be prepared first.


> **Key Takeaway:** The code is the same fit-then-predict loop from lesson 1. **Four lines of scikit-learn turn the theory into a trained model.**


## How do you know if the line is any good?

**Two checks.**

- **R-squared** is a score from 0 to 1 for how much of the variation in the output the line explains. Higher means the line accounts for more of what is happening.
- **Performance on new data**, as in lesson 1. A low error on the training points does not prove the line will work on points it has never seen.

Always check on held-out examples. A line can fit the points it was trained on and still miss on new ones.


> **Key Takeaway:** R-squared measures fit on training data. **The real test is performance on held-out examples the line has never seen.**


## Where does a straight line break?

**It only works well when the real relationship is roughly straight.**


### What if the data curves?

A straight line will **systematically miss the curve**. This gap between what a model can represent and the true pattern is called **bias**.

One fix is adding polynomial terms, which let the line bend.


### What if the inputs are noisy?

**Regularization**, such as ridge or lasso regression, adds a penalty for overly large coefficients.

- It stops the line from overreacting to noisy inputs.
- It tends to generalize better on new data.


### Other common mistakes

- trusting low training error without checking new data
- forcing a straight line onto data that is clearly curved
- letting one extreme outlier drag the whole line off course unnoticed
- treating correlation in the fitted line as cause and effect
- setting the learning rate too high

A steep slope between streak length and mood does not prove that streaks cause good moods. It shows the two move together.


> **Key Takeaway:** A straight line systematically misses curved patterns. **Watch for bias, noisy inputs, and correlation mistaken for causation.**


## Can you explain the idea back?

**Try answering these before moving on:**

- **Why minimize squared error instead of raw distance?** Squaring stops misses above and below the line from cancelling, and punishes big misses far more than small ones, so one point cannot pull the line wildly.
- **What is a key limitation of linear regression?** It only fits straight lines, so it systematically misses curved relationships unless you add terms that let it bend.
- **What does a coefficient tell you?** How much the output changes for a one-unit change in that input, holding the others fixed.
- **What does gradient descent do?** It repeatedly nudges the coefficients in the direction that shrinks the error, until nudging stops helping.

If those answers make sense, the main idea is in place.


> **Key Takeaway:** If you can explain squared error, coefficients, and gradient descent in your own words, **the main idea is in place.**


## Where should you go next?

**Try it by hand first.** Pick two related numbers you track, like hours slept and hours of focused work the next day.

- Plot five or six days on paper.
- Draw one straight line that passes as close as possible to all the dots.
- You just did linear regression with your eyes instead of an algorithm.

Use these resources to go deeper:

- [Linear regression (Wikipedia)](https://en.wikipedia.org/wiki/Linear_regression) - for the full math
- [Gradient descent (ML Visualized)](https://ml-visualized.com/chapter1/linear_regression.html) - for how the search works
- [scikit-learn: Linear Models](https://scikit-learn.org/stable/modules/linear_model.html) - for ridge, lasso, and the code you used above
- [MLU Explain: Linear regression](https://mlu-explain.github.io/linear-regression/) - for a visual walkthrough

A line is the simplest model there is. Everything later builds on the same loop: guess, measure the error, adjust.


### until the next one, keep noticing patterns.
