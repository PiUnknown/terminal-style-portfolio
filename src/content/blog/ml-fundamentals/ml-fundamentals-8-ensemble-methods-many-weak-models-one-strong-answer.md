---
title: "ML Fundamentals #8: Ensemble Methods - Many Weak Models, One Strong Answer"
date: "2026-10-24"
published: true
series: "ML Fundamentals"
order: 8
tags: "ml, fundamentals, notes"
readTime: "13 min"
excerpt: "One model carries its own blind spots. Learn how bagging, boosting and stacking combine weak, imperfect models into one strong prediction, and what that costs."
---

## What is an ensemble method?

**An `ensemble` is a group of models whose predictions are combined into one final answer.**

This is lesson 8 of the Machine Learning Fundamentals series. **Decision trees** and **random forests** were explained in [lesson 4](https://www.piunknown.dev/blog/ml-fundamentals-4-decision-trees-and-random-forests), and **overfitting**, **held-out data** and **cross-validation** in [lesson 7](https://www.piunknown.dev/blog/ml-fundamentals-7-model-evaluation-and-overfitting-learning-the-pattern-not-the-sample) - check them out if you haven't.

### Why does it matter?

- Every single model has its own blind spots, no matter how well you tune it.
- Many of the strongest results in real competitions come from combining models, not from one clever algorithm.
- Ensembling is why the random forest from lesson 4 can outperform a lone decision tree.

### Think of it like weighing a suitcase

Your flight leaves in two hours and you need to know if your suitcase is under 15 kg. There is no scale at home, so five people in the family lift it and guess.

- One says 12 kg. Another says 17. The rest land somewhere in between.
- Nobody is exactly right, but each person is off in a **different** direction.
- Average the five guesses and the number usually lands close to the truth.

Ensemble methods do this with models instead of relatives. The rest of this lesson is about **how** the guesses are collected and combined, because there is more than one way, and each way fixes a different problem.

## What will we predict?

One running example: **your college fest committee predicting this year's footfall.**

Last year 600 people showed up. This year there are new sponsors, an Instagram ad campaign and a rain forecast. The committee wants a number to plan food and security around.

Keep two numbers in mind:

- **Actual turnout on the day: 890 people.** We will pretend we do not know this yet.
- Every estimate below is trying to get close to 890 without seeing it.

## Why does combining guesses help?

Five committee members estimate the footfall independently, without discussing it first:

- **820, 940, 710, 1010, 880**

The misses are 70, 50, 180, 120 and 10 people, an average miss of **86**. Now average the five guesses:

- (820 + 940 + 710 + 1010 + 880) / 5 = **872**
- Miss: |872 - 890| = **18**

One member, the 880 guess, actually did better: its miss is 10 against the ensemble's 18. But before the fest, nobody knew which guess would be the lucky one. In this example, the average beats the **typical** guess: a miss of 18 against an average individual miss of 86, and four of the five members. That is the whole trick:

- Each person's error points a different way. Some overshoot, some undershoot.
- Averaging lets those errors **cancel**, so what survives is the part they agree on.
- One model's blind spot gets covered by another model that does not share it.

### When does this fail?

Averaging is not magic. It cancels errors only when the errors **disagree**.

- If all five members copied last year's poster count, they would all be wrong in the **same** direction, and the average would be just as wrong.
- Combining five identical models gives you the same answer five times, with nothing cancelled.
- The value of an ensemble comes from **diversity**: different data, different model types, different mistakes.

## What is bagging?

**`Bagging`** (short for **bootstrap aggregating**) trains many models **independently and in parallel**, each on a different random sample of the training data, then combines them by voting (classification) or averaging (regression).

Two ideas packed into that:

- **Bootstrap sample:** draw rows from the training set **at random, with replacement**, until the sample is as big as the original. Some rows appear twice or more, some not at all. On average each sample contains about **63%** of the unique rows.
- **Aggregating:** train one model per sample, then average or vote the predictions.

Because each model sees a different slice of the data, each overfits to slightly different noise. Averaging cancels that noise out. In the language of lesson 7, bagging mainly reduces **`variance`**, the tendency of a model to swing wildly depending on exactly which training data it happened to see.

You already know the most famous bagging model:

- The **random forest** from lesson 4 is bagged decision trees, plus one extra twist: at each split, each tree only considers a **random subset of features**.
- That extra randomness matters. Without it, the trees can become more correlated, because the same strong features tend to win the splits. The bootstrap samples still differ, so the trees are not identical, but averaging them cancels less of the error.
- Random feature subsets force the trees to make **different** mistakes, which is exactly what averaging needs.

<div data-blog-animation="ensemble-vote"><img src="/assets/ensemble-vote-poster.svg" alt="Five small trees, each trained on a different bootstrap sample, predict the fest footfall: 820, 940, 710, 1010 and 880. Their predictions flow into an averaging step that outputs 872. The actual turnout is 890, so the ensemble misses by 18, while the average single-model miss is 86."></div>

## What is boosting?

**`Boosting`** trains models **one after another in sequence**, and each new model is built to fix what the current ensemble still gets wrong.

Bagging asks: what if many independent models vote? Boosting asks: what if each model is a **correction** to the running total?

Watch it on the fest number:

- **Base guess: 600.** Last year's footfall. Actual is 890, so the leftover error, the **`residual`**, is 290.
- **Model 2** learns patterns the base missed: weekend, ad campaign. It predicts a correction of **+240**. Running total: 840. Residual: 50.
- **Model 3** notices the rain forecast and adjusts **+35** (rain hurt less than feared). Total: 875. Residual: 15.
- **Model 4** adds **+12** for the new sponsors. Total: **887**. Residual: **3**.

Each model only cleans up what is still wrong, and each correction is smaller than the last. That is boosting:

- The individual models are usually **weak learners**, models only slightly better than a rough guess, like very shallow trees.
- Alone, each is mediocre. Added in sequence, they sharpen each other into a strong model.
- In lesson 7 terms, boosting mainly reduces **`bias`**, the tendency of a model to be systematically wrong in the same direction.

<div data-blog-animation="boosting-rounds"><img src="/assets/boosting-rounds-poster.svg" alt="Boosting rounds on the fest footfall. A marker starts at the base guess 600, far from the actual 890. Round by round it hops closer: +240 to 840, then +35 to 875, then +12 to 887. The leftover residual shrinks each round: 290, then 50, then 15, then 3."></div>

### What is the learning rate?

A boosted model does not have to accept each correction in full. The **`learning rate`** scales every correction down:

- With a learning rate of 0.5, the +240 correction only adds 120.
- A smaller rate needs **more rounds** to reach the same place, but it overcorrects less and usually generalizes better.
- A large rate converges fast and can overshoot into memorizing noise.

### What is gradient boosting?

The most widely used boosting method. The idea: train each new model on the **direction that reduces the loss fastest**.

- For predicting numbers with squared error, that direction **is the residual** (up to a constant factor that the step size absorbs), so the residual-chasing trace above is literally gradient boosting.
- For classification it is not raw residuals. Each new model fits **`pseudo-residuals`**, the negative gradient of the classification loss, which points each prediction the way that cuts the loss fastest.
- Classic boosting (AdaBoost) took a different route to the same goal: reweight the hardest training examples so later models focus on them.
- XGBoost and LightGBM, the names you see winning competitions, are fast, regularized implementations of gradient boosting.

### Can boosting overfit?

Yes. Bagging's averaging keeps calming down as you add models, but boosting keeps chasing the training error:

- Enough rounds, and the ensemble starts fitting noise instead of signal.
- The fix is the lesson 7 habit: watch a **held-out** score and stop adding rounds when it stops improving. That is called **early stopping**.

## What is stacking?

**`Stacking`** is the third approach: train several **different types** of models, then train one more model, the **`meta-learner`**, to combine their outputs.

Back to the committee: instead of averaging the five guesses blindly, the head organizer learns each member's habits.

- Ravi always overshoots by about 10%. Meera is reliable on weekend years, shaky otherwise.
- The meta-learner is a model that takes the five predictions as its **features** and learns the best way to weight them.

One rule makes or breaks stacking:

- The meta-learner must be trained on **out-of-fold predictions**: each base model predicts rows it did not train on, exactly like cross-validation from lesson 7.
- Train it on the base models' training-set predictions instead, and it learns to trust whichever base model memorized the data. That is `data leakage`, and the stacked model fails on new inputs.

## Bagging vs boosting: what is the difference?

They sound interchangeable and are not. They fix different problems.

- **How they train:** bagging is independent and parallel, boosting is sequential, each round reacting to the last.
- **What each model sees:** bagging gives each model a random bootstrap sample, boosting points each model at the current ensemble's leftover mistakes.
- **How they combine:** bagging averages or votes equally, boosting adds weighted corrections.
- **What they fix:** bagging tames variance (overfitting-prone models), boosting reduces bias (too-weak models).
- **Where they go wrong:** bagging helps little when every model makes the same mistake, boosting overfits when it runs too many rounds.

## What does an ensemble cost?

The gains are not free, and honesty matters here:

- **Training time** grows with every member model, and boosting cannot even train its members in parallel.
- **Prediction time** grows too, because every member has to run before the answers can be combined.
- **Memory** grows, since you store every model, not one.
- **Explanations get harder.** One decision tree can be drawn on paper. Two hundred of them cannot.

One nuance: "more models" does not automatically mean "more expensive than every alternative." An ensemble of two hundred tiny stumps can be cheaper to train and run than one giant deep model, and more accurate. The real question is whether the accuracy gain is worth the extra machinery **for your problem**, and that is a comparison you make with a held-out score, not an assumption.

## What does it look like in code?

This assumes you supply `X` (the features) and `y` (the labels) with enough rows, at least a few dozen. Five-fold cross-validation on six rows would leave one or two rows per test fold, which is too few for a meaningful score.

The order matters: split, compare the two ensembles with cross-validation on the training part, then touch the test set once.

- `from sklearn.model_selection import train_test_split, cross_val_score`
- `from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor`
- `X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)`
- `forest = RandomForestRegressor(n_estimators=200, random_state=42)`
- `boost = GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, random_state=42)`
- `print(cross_val_score(forest, X_train, y_train, cv=5).mean())`
- `print(cross_val_score(boost, X_train, y_train, cv=5).mean())`
- `boost.fit(X_train, y_train)`
- `print(boost.score(X_train, y_train), boost.score(X_test, y_test))`

Line by line:

- **Lines 1 and 2** import the split and cross-validation helpers and both ensemble models.
- **Line 3** holds back 20% as the test set, exactly as in lesson 7.
- **Line 4** builds a random forest: bagging over 200 trees. `n_estimators` is the number of members.
- **Line 5** builds a gradient boosting model: 200 rounds, each correction scaled to 5% by `learning_rate`.
- **Lines 6 and 7** compare the two with 5-fold cross-validation on the training part only. The higher score is the one to keep.
- **Lines 8 and 9** fit the boosting model and print its training and test scores, run once, at the end. This illustrates the final fit; if the forest scored higher on line 6, fit that one instead.

The defaults matter less than the habit: `n_estimators` and `learning_rate` trade against each other in boosting, and only the held-out score tells you if more rounds are helping or just memorizing.

## What mistakes should you avoid?

- **Treating bagging and boosting as interchangeable.** Bagging fights variance, boosting fights bias. Different problems, different tools.
- **Combining models that make the same mistakes.** Identical errors cancel nothing. Diversity is the whole point.
- **Boosting for too many rounds.** The training error keeps falling while the held-out error quietly turns back up.
- **Setting the learning rate too high.** It overcorrects fast and generalizes worse than a small rate with more rounds.
- **Training a stacking meta-learner on the base models' own training predictions.** That leaks; use out-of-fold predictions.
- **Assuming an ensemble is a free upgrade.** Measure the gain against the extra training time, prediction time and complexity.

## What are the key points?

- An ensemble combines several models into one prediction, and it usually lands closer than the typical member.
- Combining works because different models make different errors, and those errors cancel.
- **Bagging** trains models in parallel on bootstrap samples and averages them. It mainly reduces variance. Random forests are bagged trees with random feature subsets.
- **Boosting** trains models in sequence, each correcting the leftovers of the current ensemble. It mainly reduces bias. Gradient boosting fits each round to the negative gradient of the loss; with squared error that is the residual up to a constant convention.
- The **learning rate** shrinks each boosting correction: smaller needs more rounds but usually generalizes better.
- **Stacking** trains a meta-learner on out-of-fold predictions to learn how to combine different model types.
- Ensembles cost more time, memory and explainability. The gain has to be worth it.

## What might an interviewer ask?

### What is the difference between bagging and boosting?

Bagging trains models independently on bootstrap samples and averages them, which mainly reduces variance. Boosting trains models sequentially, each fixing the previous rounds' mistakes, which mainly reduces bias.

### Why does averaging multiple models reduce error?

Each model's errors point different ways, so averaging cancels them. This only works when the models are diverse; if they all err the same way, nothing cancels.

### What is a weak learner?

A model only slightly better than a rough guess, like a very shallow tree. Boosting chains many weak learners into one strong model.

### Can boosting overfit?

Yes. Each round keeps pushing the training error down, and given enough rounds the ensemble can start fitting noise. Track a held-out score and stop when it stops improving.

### Why does stacking need out-of-fold predictions?

A base model's predictions on its own training rows are overconfident. Training the meta-learner on them teaches it to trust the memorizer. Out-of-fold predictions show how each base model behaves on data it never saw.

### When would you skip an ensemble?

When a single model already performs as well, when prediction latency or memory is tight, or when you need to explain individual decisions easily.

## Where should you go next?

Try it by hand first. Write down your screen time for the last 8 days, then predict today's number three ways: the plain average of all 8 (one weak model), the average of three random 6-day subsets (mini bagging), and the day 1-4 average plus two small corrections for patterns you notice, like weekends (mini boosting). Check all three against the real number tonight.

Then go deeper:

- [MLU Explain: Random Forest](https://mlu-explain.github.io/random-forest/) - bagging and random feature subsets, shown interactively as the forest grows.
- [MLU Explain: Bias-Variance Tradeoff](https://mlu-explain.github.io/bias-variance/) - the variance bagging tames and the bias boosting hunts, visualized.
- [scikit-learn: Ensemble methods](https://scikit-learn.org/stable/modules/ensemble.html) - the full menu: bagging, forests, AdaBoost, gradient boosting, voting and stacking, with runnable examples.

### until the next one, keep noticing patterns.
