---
title: "ML Fundamentals #9: Dimensionality Reduction - Squeezing Data Into Fewer Numbers"
date: "2026-10-24"
published: true
series: "ML Fundamentals"
order: 9
tags: "ml, fundamentals, notes"
readTime: "13 min"
excerpt: "Real datasets carry dozens of columns that quietly repeat each other. Learn how PCA compresses many features into a few summary directions, how to choose how many to keep, and what can silently go wrong."
---

## What is dimensionality reduction?

**`Dimensionality reduction` compresses data with many features into far fewer new features, while keeping as much of the original information as possible.**

This is lesson 9 of the Machine Learning Fundamentals series. **Overfitting**, **held-out data** and **cross-validation** were explained in [lesson 7](https://www.piunknown.dev/blog/ml-fundamentals-7-model-evaluation-and-overfitting-learning-the-pattern-not-the-sample), and **k-means** in [lesson 5](https://www.piunknown.dev/blog/ml-fundamentals-5-clustering-finding-groups-in-data-nobody-labeled) - check them out if you haven't.

### Why does it matter?

- Real datasets come with dozens or hundreds of columns, and many of them quietly repeat each other.
- A single ordinary scatter plot only shows 2 or 3 dimensions directly. You need summaries or linked views to inspect a 50-column dataset.
- Many algorithms get slower, or actively worse, as features pile up: distances between points stop meaning much and the data you would need grows out of reach. That effect is the **`curse of dimensionality`**.

### Think of it like describing a batsman

Cricket broadcasts track everything about a player: strike rate, average, boundary percentage, dot-ball percentage, balls per dismissal, and a dozen more numbers.

- Nobody compares two players on all fifteen stats at once. Commentators compress them into summary qualities: **how destructive** a batsman is, and **how dependable** he is.
- Neither quality is one of the raw stats. Each is a **blend** of many of them.
- And those blends work because they capture the ways players actually **differ** from each other. A stat where everyone is identical tells you nothing.

**`PCA` (Principal Component Analysis)** finds those blends automatically. Instead of a commentator guessing which summaries matter, it reads the numbers and picks the directions along which the data varies the most.

## What will we compress?

One running example: **a music app that stores 10 numbers for every song.**

- `energy`, `loudness`, `tempo`, `danceability`, `acousticness`, `speechiness`, `valence`, `instrumentalness`, `liveness`, `duration`.
- These columns are not independent. In this constructed dataset, `energy` and `loudness` move together; several other columns also overlap.
- So some of those 10 columns repeat part of the same story. PCA's job is to find out how many, and to write them down as new, cleaner axes.

## How does PCA pick its directions?

Start with just two of those columns, so everything fits on paper: `energy` and `loudness` for a handful of songs, plotted as a cloud of points.

**A `principal component` is a new direction through the data - a weighted blend of the original features - chosen to capture as much of the remaining spread as possible.**

- **Component 1** is the single direction along which the cloud is spread out the most. For our cloud that is the diagonal where energy and loudness rise together: about 0.87 parts energy plus 0.5 parts loudness.
- **Component 2** is the best remaining direction that is exactly **perpendicular** to component 1. For us, the short side-to-side wobble off the diagonal.

Now measure the spread of the cloud along each direction:

- Total spread in the cloud: **3.9**.
- Along the energy axis alone: about 2.8. Along loudness alone: about 1.1.
- Along component 1: **3.6**. Along component 2: **0.3**.

One blended axis holds about **92%** of the cloud's total variance (3.6 out of 3.9). Project the songs onto that line - move each one along the shortest, perpendicular path onto it - and 2 numbers per song become 1 number, with only about 8% of the spread lost.

<div data-blog-animation="pca-projection"><img src="/assets/pca-projection-poster.svg" alt="A scatter cloud of songs plotted by energy and loudness, stretched along a diagonal. Each song drops straight down onto the diagonal line, which is labelled component 1. Spread along the line is 3.6 out of the cloud's total 3.9, about 92 percent; the short perpendicular wobble, component 2, holds the leftover 0.3."></div>

### Can you calculate one compressed row?

Take a song whose centered ratings are `energy = 2` and `loudness = 1`. Its first-component score is approximately:

- 0.866 x 2 + 0.5 x 1 = **2.232**.
- Keep that one number instead of both original coordinates.
- To reconstruct approximately, multiply it back by the direction: (2.232 x 0.866, 2.232 x 0.5) = **(1.933, 1.116)**, then add the two original means.
- The reconstruction is close, not exact: the discarded perpendicular coordinate is what you cannot recover. PCA compresses; it does not preserve every detail.

Three things worth getting exactly right:

- Each component is a **blend of the original features**, not one of them. Component 1 is not secretly just `energy` - its score is approximately 0.87 x centered energy + 0.5 x centered loudness. That is the real cost of PCA: the new axes are compact but harder to name.
- The directions are **perpendicular** to each other (mathematically, `orthogonal`), and the projected values along them come out `uncorrelated`. Uncorrelated does not mean independent: nonlinear relationships can remain.
- "Most spread" is judged by **`variance`**, and variance is measured around the middle. PCA centers the cloud first, so every direction passes through the mean of the data, not through some arbitrary origin.

## How many components should you keep?

Back to all 10 song features, with enough songs to estimate them. Suppose PCA finds these 10 components, ranked by how much of the data's total variance each one explains. That share is the **`explained variance ratio`**:

- Component 1 explains 42%. Component 2: 26%. Component 3: 14%.
- Then it thins out fast: 7%, 4%, 3%, 2%, 1%, and the last two together 1%.

Add them up as you go and you get the **cumulative explained variance**:

- 2 components: 68%. Enough for a two-dimensional **map**, but 32% of the variance is missing. Neighbors in that map need not be neighbors in the full data.
- 6 components: 96%, just over the common 95% mark.
- The last 4 components together hold 4%.

The standard habit: keep adding components until the cumulative share crosses a target like 90-95%. Treat the target as a **heuristic, not a guarantee** - it promises you kept 95% of the spread, not 95% of what matters. More on that below.

Choosing the count is a judgment call, exactly like choosing k in k-means: the target gives you a defensible default, and the downstream result gives you the verdict.

<div data-blog-animation="pca-variance"><img src="/assets/pca-variance-poster.svg" alt="Bars show each component's share of variance shrinking: 42, 26, 14, 7, 4, 3, 2, 1 percent and two slivers. A cumulative line climbs over them: 68 percent at 2 components, 96 percent at 6, crossing the dashed 95 percent target line between components 5 and 6."></div>

## Why do features need scaling first?

PCA chases variance, and variance is measured in whatever units your columns happen to use.

- `duration` in milliseconds swings in the hundreds of thousands. `energy` on a 0-1 scale swings in decimals.
- Unscaled, `duration` can dominate the leading components because its **units** are bigger, not because it is more useful.

The fix has two parts, and they are not the same thing:

- **Centering is always required.** PCA measures spread around the mean, and it does this part for you internally.
- **Standardizing**, subtracting each mean and dividing by its standard deviation with `StandardScaler`, is what you add when columns come in different units, which is almost always true for mixed real-world data like these 10 columns.
- Our two-column demo uses invented ratings on the same 1-10 scale, then subtracts each mean. We deliberately preserve their different spreads. When that spread is meaningful, standardizing may remove it or inflate noise. Sharing units alone does not settle the choice; choose the scale that matches your goal.

## What can PCA not see?

**PCA is `unsupervised`: it reads only the spread of the features and never looks at your labels.**

Two consequences worth keeping in your head:

- **Variance is not the same as importance.** A direction with huge spread can be irrelevant to what you are predicting, and a direction with tiny spread can carry the whole signal. Keep 95% of the variance and you can still have thrown away the 1% that separated fraud from normal.
- Because of that, the 95% target is a starting point, not a verdict. The honest check is the lesson 7 habit: compare compression choices on validation folds, then evaluate the selected pipeline once on the untouched **test set**.

You will also hear that PCA speeds up training and reduces overfitting. Both **can** happen, and neither is promised:

- Fewer, uncorrelated inputs give a model less to chew on and less noise to memorize.
- But if the discarded variance was signal, you have made the model worse, and PCA itself adds training time and an extra step to maintain. Measure, do not assume.

## What does the full workflow look like?

Four steps, in order:

1. **Scale the features.** Center always, standardize when the units demand it. PCA is scale-sensitive.
2. **Find the components.** The directions of maximum variance.
3. **Rank by variance.** Component 1 explains the most, each next one less.
4. **Keep the top k.** Project the data onto those k directions and work with k numbers per row instead of all of them.

One rule guards the whole pipeline, and it is the same rule as lesson 7:

- Fit the scaler and PCA on the **training data only**, then transform the test data with those frozen directions.
- Fit them on the full dataset first and information from the test rows leaks into the scaling and into the components themselves. That is `data leakage`, and it makes your evaluation lie to you.
- Inside cross-validation the same rule applies per fold: keep preprocessing inside the pipeline passed to cross-validation, together with the downstream model. The simpler code below shows train/test transformation only, not cross-validation.

## What does it look like in code?

This assumes you supply `X` (the features) and `y` (the labels) as finite numeric arrays, with enough training rows and nonzero total variance. The order matters: split first, then let the pipeline learn scaling and components from the training part only.

- `from sklearn.model_selection import train_test_split`
- `from sklearn.pipeline import Pipeline`
- `from sklearn.preprocessing import StandardScaler`
- `from sklearn.decomposition import PCA`
- `X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)`
- `pipe = Pipeline([("scale", StandardScaler()), ("pca", PCA(n_components=0.95, svd_solver="full"))])`
- `pipe.fit(X_train)`
- `print(pipe.named_steps["pca"].explained_variance_ratio_)`
- `print(pipe.named_steps["pca"].n_components_)`
- `X_train_reduced = pipe.transform(X_train)`
- `X_test_reduced = pipe.transform(X_test)`

Line by line:

- **Lines 1 to 4** import the split, the pipeline, the scaler and PCA.
- **Line 5** holds back 20% as the test set, exactly as in lesson 7. Nothing is fitted yet.
- **Line 6** builds one pipeline: standardize, then PCA. `n_components=0.95` asks sklearn to keep the smallest number of components that together exceed 95% of the training variance. `svd_solver="full"` makes this fraction-based selection explicit.
- **Line 7** fits both steps on the training rows only. The means, the spreads and the component directions are all learned here.
- **Lines 8 and 9** print the `explained_variance_ratio_` of each kept component and how many components the 95% target selected.
- **Lines 10 and 11** transform both sets with the frozen pipeline. Notice there is no second `fit` anywhere: refitting on the test rows would leak.

The defaults matter less than the habit: scale, fit on training data only, then check that a model trained on `X_train_reduced` still scores well on `X_test_reduced` as a final check after selecting settings on validation folds.

## What mistakes should you avoid?

- **Running PCA on unscaled features with mismatched units.** A column measured in thousands can dominate the leading components for a purely numerical reason.
- **Assuming a principal component is one original, nameable feature.** Each one is a blend of many columns, which is also why PCA results are harder to explain to people.
- **Reducing to too few components.** A small slice of discarded variance can be exactly the signal your label cared about.
- **Fitting the scaler or PCA before splitting into train and test.** Test information leaks into the transformation. Fit on train only; inside cross-validation, refit per fold with a pipeline.
- **Treating 95% as a guarantee.** It is a heuristic about spread, not a promise about signal.
- **Assuming PCA is a free upgrade.** It can speed training up and sometimes reduces overfitting, but it costs training time and interpretability. Compare validation scores, with and without it; use the test set once at the end.

## What are the key points?

- **Dimensionality reduction** compresses many features into fewer new ones while keeping as much information as possible. It fights redundancy, makes data plottable, and pushes back on the curse of dimensionality.
- **PCA** finds new directions called **principal components**, ranked by how much of the data's variance each explains.
- Component 1 is the single direction of greatest spread. Every later component is the best direction perpendicular to the ones before it, and the projected values come out uncorrelated.
- Each component is a weighted **blend** of the original features, which is why the new axes are compact but less interpretable.
- The **explained variance ratio** guides how many components to keep. A cumulative target like 90-95% is a common heuristic, not a guarantee that you kept the useful signal.
- PCA always centers the data. Standardizing is a useful default for mixed units; keep original scales when their relative spreads are meaningful for your goal.
- PCA is **unsupervised** and never sees the labels, so it can compress away a small but label-relevant direction. Choose with validation scores and reserve the test set for the final check.

## What might an interviewer ask?

### What does the first principal component actually represent?

The single direction along which the data varies the most. It is a weighted blend of the original features, not one of them, and no other single direction captures more variance.

### Why is feature scaling important before PCA?

PCA chases variance, so a feature measured in thousands dominates one measured in decimals regardless of meaning. Standardizing puts them on comparable scales. Whether to standardize depends on whether those relative spreads are meaningful. Classical PCA centers the data either way.

### How do you choose the number of components to keep?

Look at the explained variance ratio and keep components until the cumulative share crosses a target like 90-95%, or keep 2 or 3 when the goal is a visualization. Then compare choices on validation folds, because the target says nothing about label relevance.

### Is PCA supervised or unsupervised, and why does it matter?

Unsupervised: it only looks at the spread of the features, never at labels. So it can happily discard a low-variance direction that happened to carry the signal you care about.

### Does PCA reduce overfitting?

Sometimes. Fewer, uncorrelated inputs give the model less noise to memorize. But it is not guaranteed: if the discarded variance held signal, performance drops. Treat it as an experiment to measure, not a rule.

### What goes wrong if you run PCA before splitting into train and test?

Information from the test rows leaks into the scaling and the component directions, so the test set no longer gives an independent check and the evaluation can be optimistic. Fit the transformation on training data only, and use a pipeline so cross-validation refits it per fold.

## Where should you go next?

Try it by hand first. Pick 8 songs you know and rate each one for `energy` and `loudness` from 1 to 10. Plot the 8 points on paper, draw the single line the cloud stretches along, and project every point onto it along a perpendicular path. Compare the spread along your line with the spread off it - that comparison is the whole idea of PCA, and if your line holds most of the spread, you just compressed two numbers into one.

Then go deeper:

- [StatQuest: PCA main ideas in only 5 minutes](https://www.youtube.com/watch?v=HMOI_lkzW08) - the clearest short video build-up of what the components are and where they come from.
- [Python Data Science Handbook: In Depth - Principal Component Analysis](https://jakevdp.github.io/PythonDataScienceHandbook/05.09-principal-component-analysis.html) - a full runnable walkthrough, including PCA for visualization and noise filtering.
- [scikit-learn: Decomposing signals (PCA)](https://scikit-learn.org/stable/modules/decomposition.html#pca) - the reference for `PCA`, `explained_variance_ratio_` and friends, with examples.

### until the next one, keep noticing patterns.
