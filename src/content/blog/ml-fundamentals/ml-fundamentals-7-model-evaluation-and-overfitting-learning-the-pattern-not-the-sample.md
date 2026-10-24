---
title: "ML Fundamentals #7: Model Evaluation and Overfitting - Learning the Pattern, Not the Sample"
date: "2026-10-21"
published: true
series: "ML Fundamentals"
order: 7
tags: "ml, fundamentals, notes"
readTime: "13 min"
excerpt: "A model can look perfect on the data it trained on and still fail on the next order. Use a food-delivery example to learn how to test honestly, spot overfitting, and pick the right score."
---

## What is model evaluation?

**Model evaluation is checking how well a trained model works on data it has never seen.**

This is lesson 7 of the Machine Learning Fundamentals series. Terms like **training**, **labels** and **classification** were explained in [lesson 1](https://www.piunknown.dev/blog/ml-fundamentals-1-what-machine-learning-actually-is) and [lesson 3](https://www.piunknown.dev/blog/ml-fundamentals-3-logistic-regression-predicting-yes-or-no) - check them out if you haven't.

### Why does it matter?

- A model is only useful on **future** data, not on the data it already saw.
- A great score on training data tells you almost nothing.
- Without an honest test, you ship a model that fails and find out from angry users.

### Think of it like a tailor

A tailor sews a suit for one customer. He measures every detail, including the day the customer was slouching.

- The suit fits that customer perfectly, slouch and all.
- Give the same suit to the customer's brother and it pulls in all the wrong places.

Now flip it. A free-size T-shirt fits everyone loosely and nobody well.

- **Tailored to the slouch:** learned the sample, not the pattern. That is **overfitting**.
- **Free-size for all:** too simple to follow the real shape. That is **underfitting**.

Good modelling sits between the two. Evaluation is how you find that spot.

## What will we predict?

One running example: **a food-delivery app predicting delivery time in minutes from distance in km.**

Our six past orders:

- 1 km: 16 min
- 2 km: 14 min
- 3 km: 24 min
- 4 km: 28 min
- 5 km: 28 min
- 6 km: 37 min

Each order is one **training example**. The distance is the feature. The minutes are the label.

## What is underfitting?

**`Underfitting`** means the model is too simple to capture the real pattern.

Suppose the model ignores distance and always answers with the average, **24.5 minutes**.

- A 1 km order: predicts 24.5, truth is 16. Off by 8.5.
- A 6 km order: predicts 24.5, truth is 37. Off by 12.5.
- It is wrong on the training data **and** on new data.

The tell: **bad scores everywhere**. More training will not fix it. The model needs more capacity, or better features.

## What is overfitting?

**`Overfitting`** means the model learns the training data too closely, including its noise and quirks, instead of the general rule.

The numbers below are a deliberately constructed teaching example, not measured performance. Three extra orders are kept aside and never used for fitting: **2.5 km took 22 min**, **4.5 km took 31 min**, and **7 km took 40 min**.

Compare two models fitted on the six training orders:

- **Model A:** a degree-5 polynomial. Six points pin down exactly one such curve, so it passes through all of them. (In Python: `np.polyfit(km, minutes, 5)`.)
- **Model B:** a straight line fitted by least squares, about **9.4 + 4.31 x km**.

Training error:

- Model A: **0**. It hits every point.
- Model B: never more than about 4 minutes off (worst miss 4.0 at 2 km).

Now the three kept-aside orders:

- **2.5 km** (truth 22): A says 19.2 (2.8 off), B says 20.2 (1.8 off).
- **4.5 km** (truth 31): A says 27.8 (3.2 off), B says 28.8 (2.2 off).
- **7 km** (truth 40): A says **70** (30 off), B says **39.6** (0.4 off).

Model A looked perfect on training data and is 30 minutes off at 7 km. Model B missed by up to 4.0 minutes on training data and is within half a minute at 7 km.

This is a deliberately constructed teaching example, not measured performance or proof that a flexible model always fails. It shows the pattern: **a perfect training score says nothing about new data.** The only way to know is to test on data held back, which is what the rest of this post is about.

<div data-blog-animation="overfit-fit"><img src="/assets/overfit-fit-poster.svg" alt="Deliberately constructed teaching example, not measured performance: six noisy training orders (16, 14, 24, 28, 28 and 37 minutes) with a degree-5 curve through all six and a least-squares line. Three held-out orders at 2.5, 4.5 and 7 km; at 7 km the truth is 40 minutes, the curve says 70 and the line says 39.6."></div>

The tell: **training score great, new-data score bad.**

### Why does the flexible model fail?

- Real delivery times have noise: a red light, a slow lift, a chatty customer.
- Model A treated every bit of that noise as signal and bent around it.
- Outside the points it saw, those bends can swing wildly.

## How does error change as the model gets more complex?

Take a family of models where complexity can be turned up in steps, like a polynomial that gains one more bend each step. Fit each one by minimizing training error, and score it on training data and on held-out data.

Imagine plotting complexity along the bottom and error up the side, with one line for training error and one for held-out error.

- **At the lowest complexity:** both lines sit high. The model is too simple for either set.
- **Somewhere in the middle:** the held-out line reaches its lowest point. The training line is a little below it.
- **At the highest complexity:** the training line is close to the floor, while the held-out line has climbed back up.

<div data-blog-animation="complexity-error"><img src="/assets/complexity-error-poster.svg" alt="Illustrative shape, not measured data: training error keeps falling as model complexity grows, held-out error falls then rises, and the gap on the right is overfitting."></div>

What the two lines do:

- **Training error** keeps falling. When each step can fit everything the previous step could, fitting harder cannot make the training error worse.
- **Test error** falls first, bottoms out, then climbs back up.

Read it in three zones:

- **Left side:** both errors high. Underfitting.
- **Bottom of the test curve:** the sweet spot.
- **Right side:** training error keeps falling, test error rises. Overfitting.

The widening gap between the two lines is the cost of memorizing noise.

Two cautions:

- Real curves are bumpy. Test error does not always rise in a clean U, especially with very large models.
- Training error only falls like this under the conditions above. A badly tuned fit can get worse with complexity.

The habit holds anyway: **never judge a model by its training error alone.**

## How do you test honestly?

You hide some data from the model **before** training, then grade it on that hidden data.

The honest-evaluation loop, in five steps:

- **Split** the data.
- **Train** on the training part.
- **Evaluate** on data the model has not seen.
- **Compare** the scores.
- **Check the gap** between training and held-out scores.

### What is a train/test split?

- **Training set:** the data the model learns from.
- **Test set:** data held back and used only to grade the finished model.

A common split is **80% train, 20% test**. It is a habit, not a law. With very little data you may want a different split, or cross-validation (below).

For our six orders that would be about five to train on and one to test on. Real data has many more rows.

### What is a validation set?

You often tweak a model: pick the curve's complexity, change settings. Each tweak needs a score. If you use the test set for that, you slowly tune the model to the test set.

So you carve out a third piece:

- **Training set:** learn from it.
- **Validation set:** compare options and tune settings with it.
- **Test set:** touch **once**, at the very end, for the final honest number.

A test set you peeked at many times is no longer a test set.

### What are the rules for a clean split?

- **Split first, prepare after.** Compute things like scaling averages from the training set only. Otherwise information from the test rows leaks into training. This is **`data leakage`**.
- **Shuffle when order does not matter.** If the data came sorted, an unshuffled split gives a test set that looks nothing like the training set.
- **Do not shuffle time data.** For a forecast, train on the past and test on the future. Shuffling lets the model peek at tomorrow.
- **Keep class balance.** When one outcome is rare, use a stratified split so both sets contain it in the same proportion.
- **Keep related rows together.** If the same customer appears many times, put all of their rows on one side.

## What is cross-validation?

A single split can be lucky or unlucky. With small data, one test slice may be easy or strange.

**`Cross-validation`** repeats the test several times on different slices.

For **5-fold cross-validation**:

- Cut the data into 5 equal parts, called folds.
- Round 1: hold out fold 1, train on folds 2 to 5, score on fold 1.
- Round 2: hold out fold 2, and so on.
- After 5 rounds, every row has been in a test fold exactly once.

A hand-traced result. The five scores are 0.80, 0.84, 0.78, 0.82 and 0.86.

- Add them: 4.10.
- Divide by 5: **0.82**.

Two things you learn: the typical score (0.82) and how much it wobbles (0.78 to 0.86). A wobbly score means you should trust it less.

<div data-blog-animation="cv-folds"><img src="/assets/cv-folds-poster.svg" alt="Five-fold cross-validation with the post's scores 0.80, 0.84, 0.78, 0.82 and 0.86: each round holds out a different fold, and the average is 0.82."></div>

Cross-validation is for choosing and comparing models, using the training part only. You still keep a final untouched test set for one last check.

If you scale or otherwise prepare data, do it **inside** each round, using only that round's training folds. A scikit-learn `Pipeline` does this for you. Scaling the whole dataset first leaks the held-out fold into training.

## Is accuracy enough?

**`Accuracy`** is the share of predictions that were correct. It can lie.

Take a fraud check on **1,000 transactions**. Only **10** are fraud.

- A "model" that always says "not fraud" is right 990 times.
- Its accuracy is **99%**.
- It catches **zero** fraud.

When one outcome is rare, accuracy hides the failure you care about.

### What is a confusion matrix?

A **`confusion matrix`** counts the four ways a yes/no prediction can land.

- **True positive (TP):** said fraud, was fraud.
- **False positive (FP):** said fraud, was fine.
- **False negative (FN):** said fine, was fraud.
- **True negative (TN):** said fine, was fine.

Now a real fraud model on the same 1,000 transactions. It flags 8, and 6 of those are actually fraud.

- TP = 6
- FP = 2
- FN = 4 (10 real fraud cases, 6 caught)
- TN = 988

Its accuracy is (6 + 988) / 1,000 = **99.4%**. Barely better than the useless model. The matrix shows the real difference.

### What are precision and recall?

**`Precision`** asks: when the model says yes, how often is it right?

- 6 / (6 + 2) = **0.75**

**`Recall`** asks: of all the real yes cases, how many did the model find?

- 6 / (6 + 4) = **0.60**

They often pull against each other when you move the threshold that decides what gets flagged:

- Lower the threshold to flag more, and recall tends to rise while precision tends to fall.
- Raise it to flag fewer, and precision tends to rise while recall tends to fall.

This is a tendency, not a guarantee. The exact shape depends on the model and the data.

Which matters more depends on the cost of each mistake:

- **Fraud, disease screening:** a miss is costly. Favor recall.
- **Spam filter on your inbox:** a good email in spam is costly. Favor precision.

### What is F1?

**`F1 score`** combines precision and recall into one number. It is their harmonic mean, which stays low unless both are decent.

- 2 x 0.75 x 0.60 / (0.75 + 0.60) = 0.90 / 1.35 = **0.67**

### What about regression?

Our delivery-time model predicts a number, so these classification scores do not apply. Use an error measure instead:

- **MAE (mean absolute error):** the average miss, in minutes. Easy to explain.
- **MSE (mean squared error):** squares each miss, so big misses hurt more. It is the loss used when fitting lines by least squares.

## How do you fix overfitting?

- **Get more representative data.** Noise averages out with more real, varied examples. Duplicated or biased rows do not help.
- **Simplify the model.** Fewer bends, shallower trees, fewer features.
- **Add regularization.** A penalty that discourages extreme values, so the model cannot bend freely.
- **Stop early.** For models that train in steps, stop when validation error starts rising.
- **Use cross-validation** to choose settings, instead of trusting one split.

## How do you fix underfitting?

- **Use a more flexible model.**
- **Add useful features** that expose the pattern.
- **Loosen regularization** if it is holding the model back.

## What does it look like in code?

This assumes you supply `X` (the features) and `y` (the labels) with enough rows, at least a few dozen. Five-fold cross-validation on six rows would leave one or two rows per test fold, which is too few for a meaningful score.

The order matters: split, compare options with cross-validation on the training part, then touch the test set once.

- `from sklearn.model_selection import train_test_split, cross_val_score`
- `from sklearn.pipeline import make_pipeline`
- `from sklearn.preprocessing import StandardScaler`
- `from sklearn.linear_model import Ridge`
- `X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)`
- `model = make_pipeline(StandardScaler(), Ridge())`
- `print(cross_val_score(model, X_train, y_train, cv=5).mean())`
- `model.fit(X_train, y_train)`
- `print(model.score(X_train, y_train), model.score(X_test, y_test))`

Line by line:

- **Lines 1 to 4** import the split and cross-validation helpers, the pipeline, a scaler and a regression model.
- **Line 5** holds back 20% as the test set. `random_state=42` makes the shuffle repeatable.
- **Line 6** bundles scaling and the model, so scaling is re-fitted inside every cross-validation round.
- **Line 7** runs 5-fold cross-validation on the training part only and prints the average. Use this to compare models or settings.
- **Line 8** trains the chosen model on the whole training part.
- **Line 9** prints the training score and the test score. Run it once, at the end.

### What does the score mean?

In scikit-learn, `score` depends on the estimator. These are the default conventions for the estimators used here, not a rule for every model:

- **Regressors such as `Ridge`** report **R²**. 1 is perfect, 0 means no better than always predicting the average, and it can go negative.
- **Classifiers such as `LogisticRegression`** report **accuracy** by default, which has the rare-class problem from above. Pass `scoring="f1"` or similar to `cross_val_score` for a better fit.

A big gap between the training score and the test score is the overfitting tell.

## What mistakes should you avoid?

- **Judging by training score.** It rewards memorizing.
- **Tuning on the test set.** Each peek makes the final number less honest.
- **Preparing data before splitting.** Scaling or filling gaps using all rows leaks the test set in.
- **Trusting accuracy on rare outcomes.** Check precision and recall.
- **Shuffling time-ordered data.** The model sees the future.
- **Trusting one lucky split.** Use cross-validation when data is small.

## What are the key points?

- Training error alone cannot tell you if a model learned the pattern.
- **Underfitting:** bad on training and new data. **Overfitting:** great on training, bad on new data.
- Split data into train, validation and test. Touch the test set once.
- Cross-validation repeats the test on different slices for a steadier score.
- Accuracy misleads when one class is rare. Use the confusion matrix, precision, recall and F1.
- Fix overfitting with more data, simpler models, regularization or early stopping.

## What might an interviewer ask?

### What is the difference between overfitting and underfitting?

Overfitting means low training error and high test error: the model learned noise. Underfitting means high error on both: the model is too simple.

### Why do we need a separate test set?

Training error rewards memorizing. Only data the model never trained on tells you how it will act on new inputs.

### Why keep a validation set as well as a test set?

Tuning against the test set slowly fits the model to it. Validation absorbs the tuning, so the test set stays honest for the final check.

### A fraud model has 99% accuracy. Is it good?

Not necessarily. If only 1% of cases are fraud, always answering "not fraud" also scores 99%. Check precision and recall.

### What is data leakage in evaluation?

Any way information from the test data reaches training, such as scaling with statistics from all rows before splitting. It inflates the score and fails in real use.

## Where should you go next?

Try it by hand first. Write down eight points you track, like your daily steps against the day of the week. Cover two of them **before** you do anything else. Fit a straight line to the other six, then draw a wiggly curve through all six. Now uncover the two hidden points and see which one predicts them better.

Then go deeper:

- [MLU Explain: Train, Test, and Validation Sets](https://mlu-explain.github.io/train-test-validation/) - a visual walkthrough of why we split data and what each part is for.
- [MLU Explain: Bias-Variance Tradeoff](https://mlu-explain.github.io/bias-variance/) - underfitting and overfitting, shown by moving a model's flexibility.
- [MLU Explain: Cross-Validation](https://mlu-explain.github.io/cross-validation/) - k-fold splits animated step by step.
- [MLU Explain: Precision & Recall](https://mlu-explain.github.io/precision-recall/) - the two scores and how the threshold trades one for the other.
- [scikit-learn: Underfitting vs. overfitting](https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html) - a runnable example of the curve story above.

### until the next one, keep noticing patterns.
