---
title: "ML Fundamentals #6: Feature Engineering - The Inputs You Choose Matter as Much as the Model"
date: "2026-10-19"
series: "ML Fundamentals"
order: 6
tags: "ml, fundamentals, notes"
readTime: "9 min"
excerpt: "A model only sees the numbers you hand it. Use a house-price example to learn how to reshape, combine, encode and scale inputs so the real pattern is easy to find."
---

## What is feature engineering?

**Feature engineering is the work of turning raw data into the exact inputs a model learns from.**

This is lesson 6 of the Machine Learning Fundamentals series. Terms like **classification** and **labels** were explained in [lesson 3](https://www.piunknown.dev/blog/ml-fundamentals-3-logistic-regression-predicting-yes-or-no), and **distance** between points in [lesson 5](https://www.piunknown.dev/blog/ml-fundamentals-5-clustering-finding-groups-in-data-nobody-labeled) - check them out if you haven't.

### Why does it matter?

- A model is only as good as what it is shown.
- The same data can be shown in a helpful form or a useless one.
- Fixing the form is often cheaper than buying a bigger model.

### Think of it like giving directions

Your friend is smart and follows instructions exactly. You want them to reach your house.

- **Version one:** "Go to 28.6139 N, 77.2090 E."
- **Version two:** "Opposite the red post office, third gate on the left."

Same house. Same friend. Only one version is usable on foot.

A model is that friend. It cannot guess what you meant. It can only use what you said. Feature engineering is choosing how to say it.

## What is a feature?

A **`feature`** is one measurable fact about an example, given to the model as a number.

For a house, that could be its area, its number of bedrooms, or its age.

All the features of one house, in a fixed order, make one **`feature vector`**.

- One house = one row = one vector.
- The model never sees the house. It sees only that list.

## What will we predict?

One running example for the whole post: **predicting the sale price of a house.**

Raw columns in our table:

- `length_m` and `width_m`
- `year_built`
- `neighbourhood` (Rohini, Dwarka or Saket)
- `bedrooms`
- `area_sqft`
- `has_garage` (0 or 1)

The model could try these as they come. It will do better if we reshape them first.

## How do you change one column?

Some columns hide their meaning in their raw form.

- **`year_built` = 1998** is just a big number. The model has no idea what 1998 means in 2026.
- **`house_age` = 2026 - 1998 = 28** says directly how old the house is.

The fact was in the data all along. You changed its form.

## How do you combine columns?

Sometimes the useful fact sits between two columns.

- `length_m` = 12 and `width_m` = 10 are two separate numbers.
- **`floor_area` = length x width = 120** is the one number that actually drives price.

A trace with two plots:

- Plot A: 12 x 10 = 120.
- Plot B: 20 x 6 = 120.

Look at length alone and these plots look very different. Look at floor area and they are the same. The combined column removes a distraction.

## How do you handle categories?

`neighbourhood` is text. A model needs numbers.

The quick fix is Rohini = 1, Dwarka = 2, Saket = 3. Do not do this.

It tells the model Saket is "three times" Rohini and that Dwarka sits exactly in the middle. Neighbourhoods have no such order.

### What is one-hot encoding?

**`One-hot encoding`** gives every category its own yes/no column.

- Rohini: `[1, 0, 0]`
- Dwarka: `[0, 1, 0]`
- Saket: `[0, 0, 1]`

Only one column is on per row. No fake ranking appears.

This matters most for models that compare rows by **distance**, like k-means in lesson 5. A fake order bends every distance they compute.

## How do you stop big numbers from winning?

Now compare two columns:

- `area_sqft` ranges around 800 to 2,400.
- `bedrooms` ranges around 1 to 5.

To a distance-based model, a gap of 200 sqft looks 200 times bigger than a gap of one bedroom. Bedrooms are drowned out just because of the units.

The fix is **scaling**: put columns on a comparable range.

### Standardization

**`Standardization`** shifts a column so its average is 0, then divides by its spread.

- Result: values mostly between -2 and 2.
- Good default when values are roughly bell-shaped.

### Min-max scaling

**`Min-max scaling`** squeezes a column into 0 to 1.

- Formula: (value - smallest) / (largest - smallest).
- Bedrooms 1, 3, 5 become 0, 0.5, 1.

Both do one job: stop units from deciding the winner.

## How do you choose the prep for a column?

Ask in order:

- **Is it a category?** One-hot encode it.
- **Is it a number on a very different scale?** Standardize or min-max scale it.
- **Already a small, comparable number?** Leave it alone.

`has_garage` is already 0 or 1. Touching it would only add risk.

The animation below runs three of our columns through those three outcomes.

<div data-blog-animation="feature-prep"><img src="/assets/feature-prep-poster.svg" alt="A country is one-hot encoded, area and bedrooms are scaled to 0–1, and a binary has_garage flag is left unchanged."></div>

## What should you remove?

A good feature set is also about what you leave out.

### Noise columns

- A column like `seller_favourite_colour` adds nothing real.
- Models can still find accidental patterns in it, and those patterns fail on new houses.

### Leaky columns

**`Data leakage`** means a feature quietly contains the answer, or something only known after the answer.

- Example: `agent_commission_paid`. It is calculated from the final sale price.
- The model looks brilliant in testing. In real use, that column does not exist yet.

One check catches this: **at the moment I need a prediction, would I actually know this value?** If no, remove it.

## What is binning?

**`Binning`** replaces an exact number with a bucket.

- `house_age` 28 becomes "21-40 years".
- Helpful when price does not change smoothly with age, but jumps at certain points.
- The cost is detail. A 21-year-old and a 40-year-old now look the same.

## Why can a simple model win?

Give a plain linear model `floor_area` and `house_age`. Give a huge model the raw `length_m`, `width_m` and `year_built`.

The plain model often wins.

- The huge model must work out the multiplication and the subtraction on its own.
- That costs more data, and more room for overfitting.
- You could have given it the answer in one line.

That is why practitioners ask "what fact would help here?" before they touch the settings.

## What does it look like in code?

Run: import pandas as pd
Run: df["floor_area"] = df["length_m"] * df["width_m"]
Run: df["house_age"] = 2026 - df["year_built"]
Run: X = pd.get_dummies(df[["floor_area", "house_age", "neighbourhood"]])

Line by line:

- **Line 1** loads `pandas`.
- **Line 2** multiplies two columns into one new feature.
- **Line 3** converts a year into an age.
- **Line 4** picks our features and one-hot encodes `neighbourhood` in the same step.

The model has not appeared yet. The useful work is done before it does.

## What mistakes should you avoid?

- **Leaky features.** Anything that only exists after the outcome inflates your test score and then fails in real use.
- **Dumping every column in.** More columns means more chances for coincidence.
- **Using future facts.** Building a feature from data you would not have at prediction time.
- **Trusting size.** A bigger model will not reliably invent a ratio you could have computed.
- **Numbered categories.** Passing 1, 2, 3 for neighbourhoods into a distance-based model.

## What are the key points?

- A feature is one fact about an example, given to the model as a number.
- Raw data is rarely in its most useful shape.
- Transforming or combining columns can expose signal that raw columns hide.
- Categories need encoding. Numbers on different scales need scaling.
- Remove noise and anything that leaks the future.
- Good features often beat a fancier model.

## Where should you go next?

Try it by hand first. Pick something you track, like a workout log. Turn the raw dates into "days since last workout" and the raw counts into "sets per week". Notice which version helps you predict whether you will show up tomorrow.

Then go deeper:

- [Feature engineering (Wikipedia)](https://en.wikipedia.org/wiki/Feature_engineering) - the overview of common techniques.
- [One-hot encoding (Wikipedia)](https://en.wikipedia.org/wiki/One-hot) - how the 0/1 columns work.
- [scikit-learn: Preprocessing data](https://scikit-learn.org/stable/modules/preprocessing.html) - the standard scalers and encoders, with runnable examples.

### until the next one, keep noticing patterns.
