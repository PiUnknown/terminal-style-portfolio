---
title: "ML Fundamentals #2: Linear Regression - Fitting the Best Straight Line Through Your Data"
date: "2026-10-03"
tags: "ml, fundamentals, guide"
readTime: "8 min"
excerpt: "How does a computer draw the best straight line through messy data? Start with runners and shoe sizes, then understand squared error, gradient descent, and where a straight line breaks."
---

## What is linear regression?

**Linear regression finds the straight line that gets closest to all your data points at once.**

This is lesson 2 of 11 in Machine Learning Fundamentals. If terms like model, training, features, or labels are new, refer to lesson 1. Here we build the first real model.

It predicts a number from other numbers you already know:

- a house price from its size
- a shoe size from a height
- tomorrow's sales from today's ad spend

It is a `supervised learning` model (see lesson 1): every training example comes with the correct answer attached.

## Why do we need it?

Because guessing by eye does not scale.

- With five points, you can eyeball a trend line. With five thousand, you cannot.
- Two people eyeballing the same data draw two different lines. It is not repeatable.
- You need one rule that balances every point at once, not one that chases whichever point you looked at last.

Linear regression gives you that rule, and a precise definition of "best".

## What does it look like with real people?

Picture a coach lining up ten runners and trying to guess each one's shoe size just by looking at them.

- Taller usually means bigger feet, but not always.
- One tall runner has small feet. One short runner has big feet.
- No single rule gets all ten exactly right.

So you draw one straight rule on a chart: "shoe size is roughly height times some number, plus a little extra."

Here are ten runners (made-up numbers, for illustration) with the best straight line through them:

![Ten runners with a fitted line and vertical error bars](/assets/regression-fit.png)

- Blue dots are the runners.
- The green line is the model's guess for any height.
- Each orange bar is one runner's **error**: the gap between the line's guess and the real shoe size.

You pick the line that keeps those orange bars as short as possible, taken together. That line is linear regression.

## What is the line actually made of?

Two numbers, the same ones from school algebra.

- The **slope** says how much the output changes for each one-unit increase in the input.
- The **intercept** is the line's starting value. It just shifts the whole line up or down to line up with the dots. It rarely means anything on its own.

In the runner example, the slope is the extra shoe size you get per extra centimeter of height.

A steeper slope means a stronger effect. A negative slope means the output falls as the input rises.

### What if there are several inputs?

You get one slope per input. These are called **coefficients**.

- Height and age together might predict shoe size better than height alone.
- With one input, the model fits a line. With two, a flat sheet. With more, the same idea in more dimensions, which you cannot picture but can still compute.

Each coefficient says how much the output changes for a one-unit change in that input, **holding every other input fixed**.

This is what makes linear regression explainable. You can read the coefficients and say exactly why it predicted what it did.

## What does "best" mean?

Start with a worked example before any formula.

Say the line predicts a shoe size of 42 for one runner, but the real size is 44.

- The error is 2.

Another runner has an error of 4, in the other direction: the line guessed too high instead of too low.

- The error is 4, or -4 depending on which way you subtract.

Now square each error:

- 2 squared is 4.
- 4 squared is 16.

The runner who was off by 4 counts **four times** as much as the runner who was off by 2, even though the miss is only twice as big. Squaring also makes both errors positive, so a miss above the line cannot cancel a miss below it.

Average those squared errors across every runner and you get one number for how wrong the line is. Here, with just these two runners, that is (4 + 16) / 2 = 10.

That average is the **mean squared error** (MSE). The best line is the one with the lowest MSE.

### What is the formal definition?

The **mean squared error** is the average of the squared gaps between each prediction and its real value. It is the model's **loss function**: the single number that says how wrong the line currently is.

Take it in steps:

1. For each point, measure the gap between the line's prediction and the real value.
2. Square each gap.
3. Average them.

### Why square the gaps?

- Squaring makes every error positive, so misses above and below the line cannot cancel out.
- Squaring punishes big misses far more than small ones. A miss of 4 costs 16, not 4.
- So the line does not swing wildly to please one stubborn point.

A truly extreme outlier can still drag the line noticeably. Squaring reduces that, it does not remove it.

## How does the model find the best line?

By searching. Training is a loop, most commonly **gradient descent**.

Here is the whole idea in plain words:

- raise the slope a tiny bit
- error went down? keep going
- error went up? go the other way

That's all it is. Do the same for the intercept, and repeat.

Think of walking downhill in fog. You cannot see the valley, but you can feel which way the ground slopes under your feet. Take a small step downhill, then feel again. The error is the height of the ground, and the best line is the bottom of the valley.

As a loop:

1. Scatter the points: your raw data.
2. Try a line: start from a rough guess for the slope and intercept.
3. Measure the error: the mean squared error of that guess.
4. Adjust: nudge the slope and intercept in the direction that shrinks the error.
5. Repeat until the error stops shrinking.

Here is the error across iterations, from running gradient descent on the ten runners above:

![Loss against iteration: a fast drop, then a flat tail](/assets/loss-curve.png)

- Early steps cut the error a lot, because the first guess is far off.
- Later steps barely change it.
- Flat means further nudging no longer helps. Training is done.

### What is the learning rate?

The **learning rate** controls how big each step is.

- Too high: the model overshoots the best fit and bounces around without settling.
- Too low: it creeps toward the best fit and training takes far longer.

It is a setting you choose, not something the model learns.

## How do you do it in code?

With scikit-learn, a Python machine learning library:

    from sklearn.linear_model import LinearRegression

    model = LinearRegression()
    model.fit(X_train, y_train)

    print(model.coef_, model.intercept_)
    predictions = model.predict(X_test)

Read it line by line:

- `X_train` holds the inputs (heights) and `y_train` the correct answers (shoe sizes) the model learns from. `X_test` is inputs it has not seen.
- `LinearRegression()` creates the model.
- `fit(...)` finds the best slopes and intercept from the training data.
- `coef_` holds the learned slopes. `intercept_` holds the starting value.
- `predict(...)` turns new inputs into predicted numbers.

This is the same fit-then-predict loop from lesson 1. The data variables need to be prepared first.

## How do you know if the line is any good?

Two checks.

- **R-squared** is a score from 0 to 1 for how much of the variation in the output the line explains. An R-squared of 0.8 on the runner data would mean height explains about 80% of why shoe sizes differ, and the other 20% comes from things the line does not know about.
- **Performance on new data**, as in lesson 1. A low error on the training points does not prove the line will work on points it has never seen.

Always check on held-out examples. A line can fit the points it was trained on and still miss on new ones.

## Where does a straight line break?

It only works well when the real relationship is roughly straight.

### What if the data curves?

A straight line will **systematically miss the curve**. Fixes like polynomial terms, ridge, and lasso exist for curved data and noisy inputs. Later lessons cover them.

### Other common mistakes

- trusting low training error without checking new data
- forcing a straight line onto data that is clearly curved
- letting one extreme outlier drag the whole line off course unnoticed
- treating correlation in the fitted line as cause and effect
- setting the learning rate too high

On that fourth one: say you tracked how many days in a row people kept a workout streak, and how happy they rated their mood. A steep slope would not prove streaks cause good moods. It shows the two move together. Maybe happier people just keep streaks going.

## Can you explain the idea back?

Try answering these before moving on:

- **Why minimize squared error instead of raw distance?** Squaring stops misses above and below the line from cancelling, and punishes big misses far more than small ones, so one point cannot pull the line wildly.
- **What is a key limitation of linear regression?** It only fits straight lines, so it systematically misses curved relationships.
- **What does a coefficient tell you?** How much the output changes for a one-unit change in that input, holding the others fixed.
- **What does gradient descent do?** It repeatedly nudges the slope and intercept in the direction that shrinks the error, until nudging stops helping.

If those answers make sense, the main idea is in place.

## Where should you go next?

Try it by hand first. Pick two related numbers you track, like hours slept and hours of focused work the next day.

- Plot five or six days on paper.
- Draw one straight line that passes as close as possible to all the dots.
- You just did linear regression with your eyes instead of an algorithm.

Then go deeper:

- [Linear regression (Wikipedia)](https://en.wikipedia.org/wiki/Linear_regression) - for the full math
- [Gradient descent (ML Visualized)](https://ml-visualized.com/chapter1/linear_regression.html) - for how the search works
- [scikit-learn: Linear Models](https://scikit-learn.org/stable/modules/linear_model.html) - for ridge, lasso, and the code you used above
- [MLU Explain: Linear regression](https://mlu-explain.github.io/linear-regression/) - for a visual walkthrough

A line is the simplest model there is. Everything later builds on the same loop: guess, measure the error, adjust.

### until the next one, keep noticing patterns.
