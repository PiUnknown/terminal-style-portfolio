---
title: "ML Fundamentals #10: Anomaly Detection - Spotting the Weird One"
date: "2026-10-24"
published: true
series: "ML Fundamentals"
order: 10
tags: "ml, fundamentals, notes"
readTime: "15 min"
excerpt: "Fraud, failing machines and break-ins are rare and keep changing shape, so an ordinary classifier has little to learn the rare class from. Learn how detectors learn what normal looks like, flag whatever does not fit, and why accuracy and thresholds need extra care."
---

## What is anomaly detection?

**`Anomaly detection` learns what normal data looks like, then flags new points that differ a lot from it - often without ever seeing a labeled example of the thing it is hunting.**

This is lesson 10 of the Machine Learning Fundamentals series. **Decision trees** were explained in [lesson 4](https://www.piunknown.dev/blog/ml-fundamentals-4-decision-trees-and-random-forests), **density and clustering** in [lesson 5](https://www.piunknown.dev/blog/ml-fundamentals-5-clustering-finding-groups-in-data-nobody-labeled), **held-out data, precision and recall** in [lesson 7](https://www.piunknown.dev/blog/ml-fundamentals-7-model-evaluation-and-overfitting-learning-the-pattern-not-the-sample), and **PCA and reconstruction** in [lesson 9](https://www.piunknown.dev/blog/ml-fundamentals-9-dimensionality-reduction-squeezing-data-into-fewer-numbers) - check them out if you haven't.

### Why does it exist?

- The events you most want to catch - fraud, a failing machine, an intruder on a network - are **rare**. In your history there may be a few dozen examples, or almost none.
- An ordinary classifier needs plenty of examples of every class. With one class nearly empty, there is little to learn the rare class from.
- Anomalies also **change shape**. Next month's fraud trick may look nothing like last month's, so memorizing past bad examples only protects you against the past.

### Think of it like a chai stall owner

A chai stall owner outside a metro station serves the same crowd for months.

- She never studied "unusual customers". She just knows the rhythm: office-goers at 9, students at 4, two cups for the guard at midnight.
- She has never been handed a list of what a thief looks like. Yet the person who orders forty cups at 3am, pays in a way nobody does and will not look at her stands out immediately.
- She learned **normal** so thoroughly that anything far from it gets noticed. That is the whole method: **model normal, measure distance from it.**

## What will we hunt?

One running example: **a payments app watching two numbers for every transaction** - the `amount` in rupees and the `hour` of the day.

- Normal behaviour in this constructed dataset: amounts around ₹400, mostly in the evening around 7pm.
- The thing to catch: a ₹3,500 payment at 3am. The app has almost no past examples of it, and the next fraud pattern may look different anyway.

### Why not just train a classifier?

Ordinary classification:

- Needs plenty of labeled examples of **every** class.
- Struggles when one class is extremely rare.
- Mostly recognizes patterns it was shown.

Anomaly detection:

- Learns what normal looks like, mostly **unsupervised** (no labels needed to fit).
- Works even with almost no anomaly examples.
- Can flag a weird pattern nobody has seen before.

Two honest corrections to the tidy version of that story:

- **Supervised learning is not impossible with rare classes.** If you have a few hundred labeled cases, class weights, resampling and the right metrics can work well. Anomaly detection is for when labels are too few, too stale, or too narrow.
- **"Can flag types never seen" is a hope, not a promise.** A detector flags what looks unlike the normal it learned. A new fraud that happens to look normal slips through, and a harmless oddity (a once-a-year wedding purchase) gets flagged.

### Outlier detection or novelty detection?

The terms look alike but they describe different training setups:

- **`Outlier detection`**: the training data may already contain anomalies, and you want to find them inside it. Detectors assume anomalies sit in low-density regions and do not form a big cluster of their own.
- **`Novelty detection`**: the training data is meant to be clean normal data, and you want to judge **new** points. The new anomalies can even form their own small cluster, as long as it sits in a region the clean training data never covered.
- In scikit-learn, `LocalOutlierFactor` is set up for outlier detection by default and needs `novelty=True` before it can score fresh data. Check the estimator's docs for which setup it supports.

## How do density-based methods work?

**`Density-based detection` treats normal data as sitting in dense, crowded regions of the feature space, and scores a point as anomalous when the space around it is sparse.**

- Think of towns and farmhouses: a point in a crowded neighbourhood is ordinary, a lone farmhouse miles from any town is not.
- A simple version: for each point, measure the distance to its k nearest neighbours. Big distance means sparse region means high anomaly score.
- **`Local outlier factor`** refines it: it compares a point's density with the density of its own neighbours, so a point in a naturally sparse area is not unfairly flagged next to a dense one.
- Scaling matters exactly like k-means: distance-based methods need features on comparable scales, or `amount` in rupees drowns `hour`.

### What is the simple statistical (Gaussian) approach?

Assume each feature roughly follows a **Gaussian** (bell-curve) distribution, learn its mean and spread from normal data, and flag points that are very unlikely under it.

Hand-traced with the app's amounts (mean ₹400, standard deviation ₹100):

- A ₹550 payment: (550 - 400) / 100 = **1.5** standard deviations out. Ordinary.
- A ₹3,500 payment: (3,500 - 400) / 100 = **31** standard deviations out. Absurdly unlikely under the normal pattern.
- A common rule of thumb flags anything beyond about 3 standard deviations. For a true bell curve, roughly 0.27% of normal points sit that far out, so some false alarms are built in.

Three precision notes the simple version skips:

- A bell curve's **density** is not a probability. It is probability per unit, so its raw value changes if you switch from rupees to paise. Compare points using z-scores or log-density on a fixed scale, not raw density numbers across different units.
- With several features you need their **covariance**, not just each feature alone. A ₹3,500 payment may be fine at 7pm and strange at 3am; the pair together is the clue. The multivariate version measures distance in a way that accounts for how features move together (`Mahalanobis distance`).
- If the real data is not bell-shaped (amounts are usually skewed), a Gaussian fit will mislabel normal behaviour.

## How does Isolation Forest work?

**`Isolation Forest` takes a different angle: it does not model normal at all. It randomly slices the data with trees, and anomalies - being rare and different - get cut off alone in fewer random splits than normal points.**

- Each tree picks a random feature and a random cut value between that feature's min and max, again and again, until a point is alone in its region.
- A point far from everything else is cut off in one or two slices. A point buried in the crowd needs many.
- The **number of splits** needed to isolate a point (its path length), averaged over many random trees, is the raw signal. **Short average path = anomalous.**

### Can you count the splits yourself?

Take nine amounts on one number line: ₹380, 395, 400, 410, 420, 430, 445, 460 and **₹4,000**. Cut at a random spot between the current minimum and maximum, keep the side that holds your target point, repeat until it is alone. Averaged over 20,000 random cut sequences in a simulation of exactly this setup:

- **₹4,000** is isolated in about **1.0** cuts. Almost any cut between 460 and 4,000 strands it at once.
- **₹380**, the low edge of the crowd, needs about **3.4** cuts.
- **₹420**, in the middle of the crowd, needs about **5.0** cuts.

Real forests average hundreds of such random trees, then convert the average path into a score between 0 and 1 using the expected path length for that sample size. In the original formulation, shorter than expected means higher anomaly score.

- These are decision trees, but random and unsupervised: no labels are used to choose a split.
- Limits: it uses cuts along single features, so it can struggle with anomalies that are only odd in a **combination** of features, and like most detectors it hands you a score, not a reason.

<div data-blog-animation="isolation-cuts"><img src="/assets/isolation-cuts-poster.svg" alt="A number line of nine payment amounts. Random cuts split the line; the 4,000 rupee payment is isolated after one cut, while a payment inside the crowd of normal amounts needs several cuts."></div>

## How do autoencoders catch anomalies?

**An `autoencoder` is a neural network trained to squeeze its input down into a short summary, then rebuild the original from that summary.** If you have not met neural networks yet, picture a function with adjustable knobs that learns by repeated correction.

- The first half (the **encoder**) compresses the input into fewer numbers. The second half (the **decoder**) expands them back.
- Trained on normal data, it gets good at rebuilding **normal** patterns, because that is all it practised on. It is a cousin of PCA, with curved rather than straight directions.
- Feed it something unfamiliar and the rebuild is poor. The gap between input and rebuild is the **`reconstruction error`**, and a large error is the anomaly signal.

Where the simple story breaks:

- **Autoencoders can reconstruct anomalies well.** A network with too much capacity, or a summary that is not small enough, can learn to copy almost anything, strange inputs included. The squeeze (the bottleneck) is what forces it to learn only the regular structure.
- Anomalies that look like parts of normal data can also rebuild fine, so error is a signal, not a verdict.
- Train on mostly clean normal data, set the error threshold on a held-out validation set, and keep checking it on later data.

<div data-blog-animation="reconstruction-error"><img src="/assets/reconstruction-error-poster.svg" alt="A line chart of reconstruction error for 30 transactions. Most errors are low; one transaction spikes well above a dashed threshold and is flagged, while one smaller bump stays below the threshold and is not."></div>

## How do you choose a threshold?

Almost every detector produces a **score**, not a yes or no. Somewhere you draw a line: above it, raise an alarm.

- Strict line: fewer alarms, fewer false alarms, but more real anomalies slip through.
- Loose line: more anomalies caught, but analysts drown in false alarms.
- **Where to draw it is a business decision as much as a technical one**: it depends on what a missed fraud costs against what a wasted investigation costs.

An invented but checkable example: **10,000 transactions, 20 of them real fraud**. Sweeping the line from strict to loose:

- Flag **10** payments, 8 truly fraud: precision 8/10 = **80%**, recall 8/20 = **40%**.
- Flag **40**, 14 truly fraud: precision 14/40 = **35%**, recall 14/20 = **70%**.
- Flag **100**, 16 truly fraud: precision 16/100 = **16%**, recall 16/20 = **80%**.
- Flag **400**, 18 truly fraud: precision 18/400 = **4.5%**, recall 18/20 = **90%**.

Precision is "of what I flagged, how much was real". Recall is "of all real fraud, how much did I flag". They pull against each other, and the right setting changes when costs change, so **revisit the threshold** instead of fixing it once.

<div data-blog-animation="threshold-tradeoff"><img src="/assets/threshold-tradeoff-poster.svg" alt="Two overlapping hills of anomaly scores: a tall one for normal payments and a small one for fraud on the right. A vertical threshold line slides from strict to loose while flagged count, precision and recall update: 10 flagged 80 percent precision 40 percent recall, up to 400 flagged 4.5 percent precision 90 percent recall."></div>

## Can anomaly detection and classification work together?

Yes. They are not rivals.

- A common design: the anomaly detector is a cheap **first-pass filter** over everything. It sends only flagged cases on.
- Flagged cases then go to a supervised classifier trained on whatever labels exist, or to a **human reviewer** for the final call.
- This works because the detector does not need to be right about every flag. It only needs to shrink the pile a smarter, slower step must look at.

## How do you evaluate a detector?

**Plain accuracy is nearly meaningless here.** In the example above, a model that says "normal" 10,000 times scores 9,980 / 10,000 = **99.8% accurate** and catches nothing.

- Use **precision** and **recall** at the threshold you will actually run, and the cost of each kind of miss.
- Use a ranking measure such as **average precision** (a ranking summary: precision averaged over the points where recall increases, so 1.0 means every real anomaly is ranked above every normal point) to judge the scores themselves before you pick a threshold.
- Another practical one: of the top N alerts your team can review per day, how many are real?
- **Split by time, not at random.** Train on the earlier period and test on the later one, the way the model will really be used. Random splits leak the future into training.
- Expect **drift**: normal behaviour changes (festival season, a new feature in the app), so a threshold tuned in October may misfire in November.
- With only a handful of positives, results swing a lot between runs. Report counts, not just percentages.

## What does it look like in code?

This builds the payments data, trains on an earlier period of 5,000 clean transactions, and scores a later period of 2,000 that contains 40 planted anomalies (amounts near ₹3,500, hours near 3am). `X_new` and `y_new` are only evaluated, never fitted on.

- `import numpy as np`
- `from sklearn.ensemble import IsolationForest`
- `from sklearn.metrics import precision_score, recall_score, average_precision_score`
- `rng = np.random.default_rng(42)`
- `X_train = np.c_[rng.normal(400, 100, 5000).clip(50), rng.normal(19, 3, 5000) % 24]`
- `normal = np.c_[rng.normal(400, 100, 1960).clip(50), rng.normal(19, 3, 1960) % 24]`
- `odd = np.c_[rng.normal(3500, 800, 40).clip(1500), rng.normal(3, 1.2, 40) % 24]`
- `X_new = np.r_[normal, odd]`
- `y_new = np.r_[np.zeros(1960), np.ones(40)]`
- `model = IsolationForest(n_estimators=200, contamination=0.02, random_state=42)`
- `model.fit(X_train)`
- `pred = (model.predict(X_new) == -1).astype(int)`
- `score = -model.decision_function(X_new)`
- `print(pred.sum(), precision_score(y_new, pred), recall_score(y_new, pred))`
- `print(average_precision_score(y_new, score))`

Line by line:

- **`IsolationForest(contamination=0.02)`** does not say "2% of future data is anomalous". It sets the cutoff so that about 2% of the **training** scores fall on the anomaly side. It is a threshold setting, not a promise about real prevalence. Leave it at `"auto"` or set it from your tolerance for alarms.
- **`fit(X_train)`** trains on an earlier period assumed to be mostly or entirely normal. If anomalies hide in it, the model quietly learns some as normal.
- **`predict`** returns `1` for normal and `-1` for anomaly. We convert it to `1 = flagged` to match the metric functions.
- **`decision_function`** returns a score where **lower means more anomalous**, and values below 0 are outliers at the chosen threshold. We negate it so higher means more anomalous, which is what ranking metrics expect.

Running it with these exact settings (scikit-learn 1.7.2, NumPy, seed 42) gave:

- 70 payments flagged out of 2,000, covering all 40 planted anomalies: **recall 1.00, precision about 0.57**.
- Accuracy of 1,970 / 2,000 = **98.5%**, against **98.0%** for always saying "normal" - barely better, even though every anomaly was caught.
- Average precision about **0.999**.

Read those together: the **ranking** is excellent (average precision near 1), but the 2% training cutoff flags 30 ordinary payments as well, so precision at that threshold is only 57%. The score was good and the threshold was loose. Moving the line, not retraining, is the fix. The exact numbers depend on the random data and library version; the pattern is the point.

## What mistakes should you avoid?

- **Judging by raw accuracy.** Predicting "normal" every time can look great while catching zero real anomalies.
- **Training on data that secretly contains anomalies.** The detector quietly learns that some anomalies are normal. Clean the training period, or use a method and settings that tolerate contamination.
- **Treating `contamination` as the true anomaly rate.** It is a threshold knob. Tune it against precision and recall.
- **Fixing one threshold forever.** Costs and normal behaviour both move.
- **Random train/test splits on time-ordered data.** Split chronologically and watch for drift.
- **Expecting an explanation.** Most detectors output a score, not a reason. Plan a way to show a reviewer which feature looked odd.
- **Forgetting scale.** Distance-based detectors and Gaussian fits need features on sensible scales.
- **Assuming an autoencoder will always fail on anomalies.** If it is too flexible it reconstructs them well, so validate on known anomalies when you have some.

## What are the key points?

- **Anomaly detection** learns what normal looks like and flags significant deviations, instead of needing many labeled examples of each anomaly type.
- Common approaches: **density-based** scoring, **Gaussian** statistical models, **Isolation Forest**, and **autoencoder** reconstruction error.
- **Isolation Forest** exploits the fact that anomalies are easier to isolate with random splits than normal points are.
- **Autoencoder** reconstruction error is a natural anomaly score when the network is trained on normal data and kept small enough to force it to learn regular structure.
- Detectors give scores; the **threshold** is a precision-recall tradeoff set by the costs of misses and false alarms.
- **Plain accuracy** is a poor metric on rare events. Use precision, recall, average precision and the cost of missed anomalies, with time-ordered validation.
- Detectors and classifiers combine well: detect first, then route flagged cases to a classifier or a human.
- Detection can still miss anomalies that look normal and flag harmless unusual events. Treat flags as leads, not proof.

## What might an interviewer ask?

### Why is anomaly detection often framed as unsupervised or semi-supervised rather than ordinary supervised classification?

Because anomalies are rare, varied and keep changing, there are usually too few labeled examples to train a balanced classifier. So you model normal behaviour and measure deviation from it. Supervised methods can still work when enough labels exist.

### How does an autoencoder detect anomalies without ever being shown a labeled anomaly?

It is trained only to compress and rebuild normal data, so it rebuilds familiar patterns well and unfamiliar ones poorly. The reconstruction error becomes the score, and a threshold chosen on validation data turns it into a flag. Its bottleneck must be tight enough that it cannot simply copy anything, anomalies included.

### Why is accuracy a bad metric for anomaly detection?

With 0.2% positives, predicting "normal" always scores 99.8% accuracy and catches nothing. Use precision, recall, average precision and the real cost of missed and false alerts.

### What does the contamination parameter do in Isolation Forest?

It sets the score threshold used by `predict` so that about that fraction of training points count as anomalies. It is a cutoff setting, not a guarantee about how many anomalies the new data holds.

### What is the difference between outlier and novelty detection?

Outlier detection looks for anomalies inside data that may already contain them. Novelty detection trains on clean normal data and judges new points. Contaminated training data turns a novelty setup into a quiet failure.

## Where should you go next?

Try it by hand first. Look at your phone's screen-time list and write down your total screen time for each of the last 10 days. Find the day that sits furthest from the rest and work out its gap in minutes. Then compute the average and the typical spread, and turn that gap into a z-score. That gap is exactly the signal a density-based or Gaussian detector would use. Finally compare a strict rule (flag beyond 3 standard deviations) with a loose one (beyond 1.5): which days get flagged under each, and which rule would you rather have if each false alarm cost you a minute of checking?

Then go deeper:

- [scikit-learn: Novelty and Outlier Detection](https://scikit-learn.org/stable/modules/outlier_detection.html) - outlier versus novelty detection, Isolation Forest, local outlier factor and how `contamination` and `decision_function` work.
- [scikit-learn: IsolationForest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html) - the reference for the model used in the code above, including the scoring definition.
- [MLU Explain: Precision and Recall](https://mlu-explain.github.io/precision-recall/) - an interactive look at the threshold tradeoff.
- [TensorFlow: Intro to Autoencoders (anomaly detection section)](https://www.tensorflow.org/tutorials/generative/autoencoder) - trains an autoencoder on normal heartbeats only and flags anomalies by reconstruction error against a threshold.
- [Google ML Crash Course: Class-imbalanced datasets](https://developers.google.com/machine-learning/crash-course/overfitting/imbalanced-datasets) - why rare classes break accuracy and what to do about it.

### until the next one, keep noticing patterns.
