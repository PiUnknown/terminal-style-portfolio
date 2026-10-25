---
title: "ML Fundamentals #11: Recommender Systems - Predicting What You Haven't Tried Yet"
date: "2026-10-24"
published: true
series: "ML Fundamentals"
order: 11
tags: "ml, fundamentals, notes"
readTime: "18 min"
excerpt: "Nobody can browse a catalog of millions. Learn how recommenders guess what you will like from other people's behavior, from the items themselves, or from small learned vectors, why a brand-new user or item breaks them, and why predicting ratings well is not the same as recommending well."
---

## What is a recommender system?

**`Recommender systems` predict which items a particular person is likely to want, from the history of what people did with items, from what the items are, or from both - so each person sees a short personal list instead of the whole catalog.**

This is lesson 11 of the Machine Learning Fundamentals series. **Loss and gradient descent** were explained in [lesson 2](https://www.piunknown.dev/blog/ml-fundamentals-2-linear-regression-fitting-the-best-straight-line), **distance and similarity** in [lesson 5](https://www.piunknown.dev/blog/ml-fundamentals-5-clustering-finding-groups-in-data-nobody-labeled), **held-out data, precision and recall** in [lesson 7](https://www.piunknown.dev/blog/ml-fundamentals-7-model-evaluation-and-overfitting-learning-the-pattern-not-the-sample), and **squeezing data into a few learned numbers** in [lesson 9](https://www.piunknown.dev/blog/ml-fundamentals-9-dimensionality-reduction-squeezing-data-into-fewer-numbers) - check them out if you haven't.

### Why does it exist?

- A catalog can hold millions of items. No one can scroll through enough of them to find the few they would love.
- You want the list to be **personal**, but a brand-new user has given the system almost nothing to personalize with.
- Items and tastes keep changing. A hand-written rulebook ("people who buy X get Y") goes stale the week after you write it.

### Think of it like a library that only keeps borrowing slips

Imagine a small library where nobody has ever read a book - the librarian only keeps the stamped slips of who borrowed what.

- She can still help. "Three people who borrowed the same books you did also borrowed this one - try it." She never opens that book. She only trusts the **pattern of slips**. That is **collaborative filtering**.
- Another librarian ignores the slips and reads the blurbs. "You borrowed two slow-burn mysteries, and here is another slow-burn mystery." That librarian only trusts **what the books are**. That is **content-based filtering**.
- A book that arrived this morning has no slips yet. The first librarian is blind to it, and the second can describe it immediately.
- A member who joined this morning has an empty card. Now **both** librarians have nothing to start from.
- A good library combines both, and also remembers the new arrivals shelf and the book club pick. That is a **hybrid**.

## What will we recommend?

One running example: **a campus food-delivery app with 6 users and 5 dishes**. Everything below uses these numbers, and they are made up to keep the arithmetic readable.

Each user rated some dishes from 1 to 5. A rating of 4 or 5 counts as **liked**. A dot means not rated.

- **Asha:** Dosa 5, Idli 4, Biryani ·, Kebab 1, Noodles ·
- **Bilal:** Dosa 4, Idli 5, Biryani 2, Kebab ·, Noodles 1
- **Chetan:** Dosa 1, Idli ·, Biryani 5, Kebab 4, Noodles 2
- **Divya:** Dosa ·, Idli 2, Biryani 4, Kebab 5, Noodles ·
- **Esha:** Dosa 5, Idli ·, Biryani 1, Kebab ·, Noodles 4
- **Farhan:** Dosa 2, Idli 1, Biryani ·, Kebab 5, Noodles 5

The job: for Esha, decide what to put in front of her among the dishes she has not rated.

### What does a blank cell mean?

- **A blank is missing, not a dislike.** Esha has not rated Idli. She may never have seen it, never had a chance to try it, or it was never shown to her. Treating every blank as "dislike" teaches the model that nobody likes anything.
- **Real grids are mostly blank.** A person touches a tiny sliver of a catalog, so the model must fill in huge empty regions from sparse evidence. This one is unusually full: 21 of 30 cells.
- **Explicit versus implicit feedback.** Ratings are explicit and rare. Clicks, orders, watch time and skips are `implicit feedback`: plentiful and noisy, and what each one means depends on the action and the context. A click can mean interest or curiosity, a quick exit or skip can be a mild negative, and a missing click can mean anything.

## How does collaborative filtering work?

**`Collaborative filtering` predicts what a user will like from patterns across many users' behavior, without ever needing to know what the items are.**

Two flavours:

- **User-based:** find users whose past behavior looks like yours, and recommend what they liked that you have not seen.
- **Item-based:** find items that tend to be liked by the same people, and recommend items related to the ones you already liked.

The figure below walks through one simple item-based version on our grid. It is one way of using item co-interaction, not the one required algorithm.

<div data-blog-animation="item-cf-steps"><img src="/assets/item-cf-steps-poster.svg" alt="A grid of six users and five dishes with ratings from 1 to 5. Esha liked Dosa. Asha and Bilal also liked Dosa, and both of them liked Idli, so Idli gets recommended to Esha. Her empty Idli cell means unseen, not disliked."></div>

### Can you trace it by hand?

For each pair of dishes, count the users who liked both, then divide by the number of users who liked **either** one:

- **Dosa and Idli:** liked by both Asha and Bilal, and by Esha only for Dosa. Both: 2. Either: 3 (Asha, Bilal, Esha). Score **2/3 = 0.67**.
- **Biryani and Kebab:** both liked by Chetan and Divya; Farhan liked Kebab only. Score **2/3 = 0.67**.
- **Dosa and Noodles:** only Esha liked both. Either: 4 (Asha, Bilal, Esha, Farhan). Score **1/4 = 0.25**.
- **Kebab and Noodles:** only Farhan liked both. Either: 4. Score **0.25**.
- **Dosa and Biryani, Idli and Biryani**, and the other cross-pairs: nobody liked both. Score **0**.

Esha liked Dosa and Noodles and has two unseen dishes: **Idli scores 0.67** through Dosa, and **Kebab scores 0.25** through Noodles. Idli wins clearly.

### Why divide by "either"?

- Raw counts favour **popular** items: a dish everybody orders co-occurs with everything. Dividing by how many people liked either dish keeps the score about the relationship, not the popularity.
- `Cosine similarity` and the `Jaccard` overlap used here are two common choices. On like and no-like data like ours, both turn "who liked what together" into a number between 0 and 1.

### What are its strengths and weaknesses?

- **Strength:** it needs no description of the items at all. It can surprise you, because people's behavior links items that no attribute list would connect.
- **Strength:** item-based versions are popular partly because relationships between items tend to change more slowly than the behavior of individual users, though this depends on the product.
- **Weakness:** it needs interactions. A new dish has none, so it can never co-occur with anything. Hence the cold-start problem below.
- **Weakness:** popular items collect interactions fastest and so get recommended most, which collects them even faster.

## How does content-based filtering work?

**`Content-based filtering` recommends items whose own attributes are close to the attributes of items the user already liked, regardless of what other users did.**

Describe every dish with a few attribute numbers from 0 to 1. These numbers are invented for illustration:

- **Dosa:** spicy 0.3, heavy 0.3, south-Indian 1
- **Idli:** spicy 0.1, heavy 0.1, south-Indian 1
- **Biryani:** spicy 0.8, heavy 0.9, south-Indian 0
- **Kebab:** spicy 0.7, heavy 0.7, south-Indian 0
- **Noodles:** spicy 0.6, heavy 0.5, south-Indian 0
- **Appam (brand new, nobody has rated it):** spicy 0.25, heavy 0.2, south-Indian 1

### How do you compare a user to a dish?

- Build a **user profile**: the average of the attribute vectors of the dishes they liked.
- Score each dish by **cosine similarity** between the profile and the dish. For vectors `a` and `b` this is `(a · b) / (|a| |b|)`: 1 means they point the same way, near 0 means they share little.

A user who liked Dosa and Idli:

- Profile: average of (0.3, 0.3, 1) and (0.1, 0.1, 1) = **(0.2, 0.2, 1.0)**.
- **Appam:** cosine **0.999**. Very close.
- **Biryani:** **0.272**. **Kebab:** **0.272**. **Noodles:** **0.271**. Far.

So the brand-new Appam is recommended immediately, with zero ratings. That is the main win of content-based filtering.

### Where does content-based filtering go wrong?

- **It needs some record of the user's taste.** With no liked dishes there is nothing to average. The profile is empty, and the similarity is `0 / 0`.
- **It stays inside the established taste.** It rarely surprises you, because it can only say "more of the same".
- **An average can blur two tastes.** Esha liked Dosa (south-Indian) and Noodles (not). Her average profile is (0.45, 0.40, 0.50), a point between her tastes. It scores Appam 0.843, Kebab 0.768, Biryani 0.764 and Idli 0.740 - nothing stands out, and it fits neither taste well. Fixes keep several profile vectors per user, or learn the weights instead of averaging.
- **It is only as good as the attributes.** Someone has to write or extract them, and they may miss the thing people actually care about.

## What is the cold-start problem?

**The `cold-start problem` is the difficulty of recommending well when a user or an item has little or no history yet.**

- **New item:** nobody has interacted with it. Collaborative filtering has nothing to compare. Content-based can score it from attributes.
- **New user:** no history of their own. Collaborative filtering has no row to compare. Content-based has no liked dishes to build a profile from, so it is stuck too.
- **New system:** everything is cold at once.

<div data-blog-animation="cold-start"><img src="/assets/cold-start-poster.svg" alt="A schematic table with three rows: known dish and user, brand-new dish, brand-new user. Collaborative filtering has signal only for the known dish and user. Content-based filtering has signal for the known case and for the brand-new dish, but not for a brand-new user."></div>

### What do systems do about it?

- **Fall back to popularity** for brand-new users, then switch as soon as there is history.
- **Ask a few taste questions** during onboarding ("pick three dishes you like").
- **Use the first session** - what they clicked, searched or skipped - as early implicit signal.
- **Feed item attributes into the model** so new items start with a sensible position instead of a blank one.
- **Explore on purpose:** show a new item to a small share of users so it can collect its first interactions.

### Does collaborative filtering overtake content-based as history grows?

You will often see a schematic chart where collaborative filtering starts below content-based and ends above it as a user's number of ratings grows. Treat it as a picture of an idea, not a measurement.

- The chart has no data, dataset or error bars. Where the lines cross, and whether they cross at all, depends on the data, the features and how well each method is built.
- With rich, informative item attributes and little behavior data, content-based methods can stay competitive for a long time.
- The safe claim is smaller: a method that learns **only** from interactions has less to go on when there are few of them.

A common mistake follows from this. A product that launches new items every day and uses pure collaborative filtering can never show its newest items, so they never collect the interactions that would make them visible.

## How does matrix factorization work?

**`Matrix factorization` implements collaborative filtering by giving every user and every item a short vector of learned numbers, and predicting a rating from how well the two vectors line up.**

### What are the vectors?

- Think of the ratings grid as a big matrix `R` with users as rows and items as columns, mostly blank.
- Learn a small matrix of **user vectors** and a small matrix of **item vectors**, each with `k` numbers per row (say `k = 2`).
- The predicted rating for user `u` and item `i` is the **dot product** of their two vectors: `p_u · q_i`, meaning multiply matching entries and add.
- With `p = (0.5, -0.2)` and `q = (0.4, 0.3)`: `0.5 × 0.4 + (-0.2) × 0.3 = 0.20 - 0.06 = 0.14`.

Why it works: `k` is much smaller than the number of users or items, so on a large, well-covered matrix the model has far fewer numbers than cells and is pushed toward shared patterns - the same compression idea as lesson 9. That limits its capacity but does not prevent overfitting: on a tiny grid like ours it can still memorize, as the code below shows. The vectors are called `latent factors` because nobody supplies them - they are learned from the ratings.

### Why add bias terms?

- Some users rate everything high. Some dishes are loved by everybody. The dot product should only explain **what is left after that**.
- A common form is `prediction = μ + b_u + b_i + p_u · q_i`: the global average rating, plus a user offset, plus an item offset, plus the personal match.
- In our example the global average of the training ratings is exactly 3.5.

### How is it trained?

- **Loss:** squared error `(actual - predicted)²`, summed over the **observed** ratings only. Blanks are not treated as zeros. We write it with a factor of one half, `½ × (actual - predicted)²`, so its gradient is simply the error times the other vector. Without the half, the 2 just folds into the learning rate.
- **Regularization:** a penalty on the size of the vectors and biases (`½ × reg ×` the sum of their squares in our code) that discourages the model from memorizing its training cells. It helps but does not remove the risk. Recall overfitting from lesson 7.
- **Optimizer:** gradient descent nudges every vector to cut the error. Another common method, alternating least squares, solves for the user vectors and item vectors in turns.
- For **implicit feedback**, blanks carry weak information ("not seen" is not "disliked"), so such models usually weigh unobserved cells low instead of ignoring or fully trusting them.

### Can you trace one training step by hand?

Ignore biases and the penalty for clarity, and use the half-squared loss so the update is the one in the code: global average 3.5, `p = (0.5, -0.2)`, `q = (0.4, 0.3)`, actual rating 5, learning rate 0.1.

- Prediction: `3.5 + 0.14 = 3.64`. Error: `5 - 3.64 = 1.36`.
- New `p` = `p + 0.1 × 1.36 × q` = `(0.5544, -0.1592)`.
- New `q` = `q + 0.1 × 1.36 × p` (old `p`) = `(0.468, 0.2728)`.
- New prediction: `3.5 + 0.5544 × 0.468 + (-0.1592) × 0.2728` = **3.716**, closer to 5. Real training repeats this across all observed ratings, many times, with the regularization term added.

### Do the factors have meanings?

Often a learned factor seems to line up with an idea like "more action" or "more mainstream". Do not count on it.

- Take the same example. Rotate both `p` and `q` by 90 degrees: `p` becomes `(-0.2, -0.5)` and `q` becomes `(0.3, -0.4)`. The dot product is `-0.06 + 0.20 = 0.14` again.
- Every coordinate changed and every prediction stayed the same. A pure rotation also leaves the vector sizes alone, so even the size penalty cannot tell the two descriptions apart. **Which direction the "factor 1" axis points is arbitrary.**
- More generally, mix every user vector with an invertible matrix `A` and every item vector with its inverse transpose, and all predictions stay the same. That broader mix can change the size penalty, so regularization may prefer some descriptions, but it does not make any axis meaningful.
- That is why a factor is often a messy blend with no single clean name. Naming one takes extra checking, not just a label guess.

<div data-blog-animation="latent-rotation"><img src="/assets/latent-rotation-poster.svg" alt="A two-dimensional map of six user arrows and five dish squares learned from the toy ratings. Two dashed factor axes rotate over the map. Every coordinate of Esha and Idli changes with the axes, but their dot product stays 0.225, so the predicted rating of 3.413 does not change."></div>

## What does it look like in code?

This trains on the 6 by 5 grid with three ratings held out, then checks the held-out ones. It uses full-batch gradient descent with a mask, so every update covers all observed cells at once and the code has no nested loops. The update rule is the hand trace's (half-squared loss), summed over all observed cells, plus the penalty.

```python
import numpy as np

R = np.array([
    [5, 4, 0, 1, 0],
    [4, 5, 2, 0, 1],
    [1, 0, 5, 4, 2],
    [0, 2, 4, 5, 0],
    [5, 0, 1, 0, 4],
    [2, 1, 0, 5, 5],
], dtype=float)
M = (R > 0).astype(float)

test = [(1, 4), (3, 1), (5, 0)]
for u, i in test:
    M[u, i] = 0

rng = np.random.default_rng(0)
k, lr, reg = 2, 0.02, 0.1
mu = (R * M).sum() / M.sum()
bu, bi = np.zeros(6), np.zeros(5)
P, Q = rng.normal(0, 0.1, (6, k)), rng.normal(0, 0.1, (5, k))

predict = lambda: mu + bu[:, None] + bi[None, :] + P @ Q.T

for epoch in range(2000):
    E = M * (R - predict())
    P, Q = P + lr * (E @ Q - reg * P), Q + lr * (E.T @ P - reg * Q)
    bu, bi = bu + lr * (E.sum(1) - reg * bu), bi + lr * (E.sum(0) - reg * bi)

rmse = lambda pred, idx: np.sqrt(
    np.mean([(R[u, i] - pred[u, i]) ** 2 for u, i in idx])
)
train = [(u, i) for u in range(6) for i in range(5) if M[u, i]]
print(
    rmse(predict(), train),
    rmse(predict(), test),
    rmse(np.full((6, 5), mu), test),
)
print(predict()[4, 1])
```

Line by line:

- **`R` and `M`:** `R` holds the ratings with 0 for blank. `M` is a mask of 1 where we **may** learn from a rating and 0 elsewhere - blanks, and the three test cells, which are hidden on purpose.
- **`test`:** Bilal-Noodles (actual 1), Divya-Idli (actual 2) and Farhan-Dosa (actual 2) are never trained on.
- **`mu`:** the global average of the 18 training ratings. The model starts from it and learns offsets.
- **`bu`, `bi`, `P`, `Q`:** user biases, item biases, and the small random starting vectors. `k = 2` is the number of latent factors.
- **`predict`:** the whole grid at once: `μ + b_u + b_i + p_u · q_i`. `P @ Q.T` is every dot product.
- **The loop:** `E` is the error, but only on observed cells (the mask zeroes the rest). The vector updates are the hand-trace rule with the penalty `reg` added. Both vectors update from the **old** values, as in the hand trace.
- **`rmse`:** root mean squared error. The last `print` compares the model to a baseline that always predicts the average.

Running it (NumPy 2.2.6, seed 0) gave:

- Error on the 18 training ratings: **0.04**. Error on the 3 held-out ratings: **1.58**. The always-predict-the-average baseline scores **1.89** on those same 3.
- Predicted rating for Esha and Idli: **3.41** (that is `3.5 - 0.186 - 0.126 + 0.225`).

Read these with care:

- The big gap between 0.04 and 1.58 is **memorizing**: with 18 ratings and 2 factors the model fits its training cells almost exactly and has little to say about new ones.
- Three held-out ratings prove nothing either way. In a quick check, changing the seed, `k` or `reg` moved the test error between about 1.57 and 2.58, and Esha's Idli prediction between about 3.3 and 5.1.
- This toy shows the **mechanics**, not that factorization beats averaging in general. Real data has thousands of users and many more ratings, and tuning is done on a proper validation set. The exact numbers depend on the data and library version.

## How do real systems combine these?

**Most large recommenders are hybrids: several methods plus extra signals, arranged in stages.**

- **Candidate generation:** a cheap method (learned vectors, item similarity, simple rules) pulls a few hundred plausible items out of millions.
- **Ranking:** a richer model scores those few hundred using more signals: user history, item attributes, time of day, device, how recent and how popular the item is.
- **Re-ranking:** adjusts the final list with rules and goals that the score does not capture: remove items already bought, avoid five near-identical results, mix in fresh items, respect stock and policy.
- This split exists because a heavy model cannot score millions of items per request, and a cheap one is not accurate enough to order the final handful.

## How do you evaluate a recommender?

Predicting ratings accurately is only part of it. A model can fit ratings well and still produce a bad list.

### Why can rating error mislead?

A concrete case: a user's 10 later ratings are 5, 4, and eight 1s (the two liked dishes and eight they would hate).

- **Model P** predicts the liked dishes at 3.2 and 2.8, one hated dish at 3.5, and the other seven hated dishes at exactly 1. Its rating error (RMSE) is **1.05**. Its top 2 is the hated dish and one liked dish: **precision@2 = 0.5**.
- **Model Q** predicts 5 and 4 for the liked dishes and 2.5 for all eight hated ones. Its RMSE is worse, **1.34**. But its top 2 are exactly the two liked dishes: **precision@2 = 1.0**.
- The lower-error model gives the worse list. Rating error spends most of its effort on the many items the user would never be shown. A recommender is judged on **the top of the ranking**.

### Which metrics fit the job?

- **Rating error** (RMSE, MAE): only for rating prediction.
- **Ranking metrics:** `precision@k` and `recall@k` ask how many of the top `k` are relevant and how many relevant items made it in. `NDCG` also rewards placing relevant items higher up the list.
- **Beyond accuracy:** **diversity** (not five near-identical items), **novelty** (not things they already know), and **coverage** (how much of the catalog ever gets shown).
- **Online results:** clicks, orders, retention, tested in a controlled A/B experiment, because offline scores do not tell you what real people do.

### What can go wrong with the data?

- **Time leakage:** a random split can train on future behavior to predict the past. Split by time, as in lesson 7.
- **Exposure bias:** you only see feedback on items the system showed. Items never shown look "unliked", and the model can learn its own old choices back.
- **Clicks are not satisfaction.** A catchy but disappointing item gets clicks. Check later signals too: returns, skips, repeat use.
- **Always compare with a popularity baseline.** "Recommend what most people liked" is hard to beat on some data.

## What mistakes should you avoid?

- **Using pure collaborative filtering for a product that keeps launching items.** New items never get shown, so they never gather interactions.
- **Judging only on rating-prediction accuracy.** Ignore diversity, novelty and what people click and you can ship a list that scores well and feels repetitive.
- **Assuming a latent factor has a clean human meaning.** The axes are arbitrary up to rotation and similar paired transforms, and a factor is often a blend.
- **Using only content similarity.** The user gets a narrow, repetitive feed with no room for a pleasant surprise.
- **Treating blanks as dislikes.** The model learns that nobody likes anything.
- **Splitting randomly across time,** or tuning on three held-out cells.
- **Skipping the popularity baseline,** then crediting a fancy model for what "most popular" already gave.

## What are the key points?

- **Collaborative filtering** learns from patterns across many users' behavior, without needing to know what items are.
- **Content-based filtering** uses the items' own attributes. It scores a brand-new item at once, but needs some record of the user's taste and tends to stay in it.
- The **cold-start problem** - a new user or item with little history - is the central weakness of methods that learn only from interactions. Content signals help new items, not new users with nothing.
- **Matrix factorization** gives users and items small learned vectors and predicts from their dot product, usually with bias terms and regularization, trained on observed ratings only.
- **Latent factors** are learned, and are often a messy blend. Their axes are arbitrary: rotating them, or mixing users and items with paired inverse-transpose transforms, leaves predictions unchanged.
- Most large systems are **hybrids** in stages (candidates, ranking, re-ranking) that blend both approaches with signals like recency, popularity and business rules.
- Judge a recommender on the **ranking** and on diversity, novelty and real clicks, with time-ordered validation, not rating error alone.

## What might an interviewer ask?

### What is the cold-start problem, and which approach struggles with it more?

It is the difficulty of recommending for a brand-new user or item with little or no history. Collaborative filtering struggles with both, because it learns only from interactions. Content-based filtering copes with a new item if it has attributes, but still needs some record of the user's taste. Fixes: popularity fallbacks, onboarding questions, attributes in the model, and deliberate exploration.

### How does matrix factorization actually predict a rating?

Each user and each item gets a small vector of learned numbers (latent factors). The prediction is the dot product of the user's and the item's vectors, usually plus a global average and user and item offsets. The vectors are trained by gradient descent to match the **observed** ratings, with regularization to avoid memorizing them.

### Why is a missing rating not treated as a dislike?

Blank means unseen, untried or never shown, not rejected. Training on blanks as zeros teaches the model that nothing is liked. Explicit-rating models learn from observed cells only. Implicit-feedback models give unobserved cells a small, down-weighted role.

### Why can a model with lower RMSE still recommend worse?

RMSE averages error over every rated item, most of which would never be shown. Recommendation is decided by the top of the ranking, so precision@k, recall@k or NDCG on held-out, time-ordered data match the job better, along with online tests.

### Why can't you trust that a latent factor means something like "action"?

Rotating the factors (or mixing users with any invertible matrix and items with its inverse transpose) changes the coordinates and leaves all dot products, and so all predictions, unchanged. The data cannot choose between those descriptions, and regularization only prefers some of them, so any single axis is arbitrary. You can inspect factors for patterns, but a name is a hypothesis to test.

## Where should you go next?

Try it by hand first. Pick 4 friends and 5 things you can all rate, like snacks, shows or apps. Ask each to rate them 1 to 5 and leave at least one blank. Choose one blank. First guess it by **behavior only**: find the friend whose ratings sit closest to the asker's on the items both rated, and use that friend's rating. Then guess it by **content only**: write 3 attributes from 0 to 1 for each thing and score the blank against what the asker liked. When the two guesses disagree, decide which you would trust here and why, and what a hybrid would do.

Then go deeper:

- [Google ML Crash Course: Content-based filtering](https://developers.google.com/machine-learning/recommendation/content-based/basics) - similarity between user and item embeddings, with a worked example and the pros and cons.
- [Google ML Crash Course: Matrix factorization](https://developers.google.com/machine-learning/recommendation/collaborative/matrix) - the objective over observed entries, weighting popular items, and how SGD and weighted alternating least squares minimize it.
- [Google ML Crash Course: Re-ranking](https://developers.google.com/machine-learning/recommendation/dnn/re-ranking) - freshness, diversity and fairness, and what to do about new items and users.
- [Matrix Factorization Techniques for Recommender Systems (Koren, Bell and Volinsky)](https://datajobs.com/data-science-repo/Recommender-Systems-%5BNetflix%5D.pdf) - the classic paper behind the biased, regularized model used above, from the Netflix Prize era (a hosted copy).
- [Surprise: matrix factorization algorithms](https://surprise.readthedocs.io/en/stable/matrix_factorization.html) - a Python library whose `SVD` implements the biased model, with its prediction formula and parameters, if you want to try it on a real ratings dataset.
- [Eugene Yan: System Design for Recommendations and Search](https://eugeneyan.com/writing/system-design-for-discovery/) - how real systems split offline and online work and retrieval and ranking.

### until the next one, keep noticing patterns.
