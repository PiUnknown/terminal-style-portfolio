---
title: "ML Fundamentals #5: Clustering - Finding Groups in Data Nobody Labeled"
date: "2026-10-13"
series: "ML Fundamentals"
order: 5
tags: "ml, fundamentals, notes"
readTime: "12 min"
excerpt: "Every model so far needed answers to learn from. Clustering has none. Watch a cafeteria sort itself into tables, trace k-means by hand, then meet DBSCAN and hierarchical clustering."
---

## What is clustering?

`Clustering` is **grouping data points by how similar they are, with no answers given in advance.**

This is lesson 5 of the Machine Learning Fundamentals series. Terms like labels and training examples used here were explained in [lesson 1](/blog/ml-fundamentals-1-what-machine-learning-actually-is). Check it out if you haven't.

Picture the first day at a new school. Nobody assigns lunch tables.

- By the end of the week, tables have formed anyway.
- One table is the football crowd. One is the gamers. One is the people who just want to finish homework.
- No one handed out group names. Kids drifted toward the people most like them.

If you only had a photo of the cafeteria, you could still point at the clumps. That is clustering.

## Why do we need clustering?

Every model so far learned from labeled rows: each example came with the right answer attached. Real data rarely arrives like that.

- Labeling is slow, so most data you collect has no labels.
- Sometimes you do not even know what the categories should be.
- You may just want to ask: "is there any structure in here I have not noticed?"

Clustering is the tool for that question. It looks for groups without being told what to look for.

## What does "similar" mean to a computer?

A computer cannot sense vibes. It needs a number.

- Each data point is a list of measurements, so it sits at a position in space.
- Points that sit **close together** count as similar.
- The usual way to measure closeness is `Euclidean distance`, which is the straight-line distance you would get from a ruler.

So clustering really means: find clumps of points that sit near each other.

## What is k-means?

`K-means` is **the most popular clustering algorithm.** You tell it how many groups you want, and it finds them.

- That number of groups is called `k`.
- It is your choice. The algorithm never works it out for you.

Back to the cafeteria. Say a teacher announces: "we are making 3 tables."

1. She sticks a flag in the floor for each table, in random spots.
2. Every student walks to their nearest flag.
3. Each flag then moves to the middle of the crowd standing around it.
4. Some students now find a different flag closer, so they walk over.
5. Repeat until nobody needs to move.

That is the whole algorithm. The flags are called `centroids`.

<div data-blog-animation="k-means"><img src="/assets/kmeans-poster.svg" alt="K-means on the made-up values 1, 2, 4, 9, 10, 12: assign to nearest centres, move centres to means, repeat until converged."></div>

### What is a centroid?

A `centroid` is **the average position of all the points currently in a group.**

- It does not have to be one of your actual data points.
- It is just the center of the crowd.
- The "means" in k-means comes from this averaging step.

## Can you trace k-means by hand?

Yes. Use six numbers on a line: `1, 2, 4, 9, 10, 12`. Ask for `k = 2`. These numbers are made up so the arithmetic is easy.

### Round 1

Start with two centroids at `1` and `4`, picked arbitrarily.

- `1` and `2` are nearest to the centroid at `1`.
- `4`, `9`, `10` and `12` are nearest to the centroid at `4`.
- New centroids: the average of `1, 2` is **1.5**. The average of `4, 9, 10, 12` is **8.75**.

### Round 2

- `4` is now closer to 1.5 (distance 2.5) than to 8.75 (distance 4.75), so it switches groups.
- `9`, `10` and `12` stay with 8.75.
- New groups: `1, 2, 4` and `9, 10, 12`. New centroids: about **2.33** and **10.33**.

### Round 3

- Check every point again. `4` is still closer to 2.33. `9` is still closer to 10.33.
- Nobody switches. The algorithm stops.

That stopping point is called `convergence`. The groups it found are the two obvious clumps you could have spotted by eye.

## How does k-means start well?

Notice we picked the starting centroids by hand. In real runs they are placed randomly.

- Unlucky random starts can lead to different final groups on different runs.
- `k-means++` fixes much of this. It still starts randomly, but it **spreads the starting centroids far apart** instead of letting two land in the same clump.
- Most libraries use it by default.
- Running the algorithm a few times and keeping the best result is also normal.

## How do we know a grouping is good?

We need a score. Otherwise "good" is just opinion.

### What is inertia?

`Inertia` (also called `within-cluster sum of squares`) is **the total squared distance from every point to its own group's centroid.**

- Small inertia means tight groups, with points hugging their centroid.
- Large inertia means loose, spread-out groups.
- Inertia is exactly what k-means is trying to push down on every round.

For our six numbers, the final groups give: `1.78 + 0.11 + 2.78` for the first group and the same for the second. That adds up to about **9.33**.

## How do you choose k?

This is the hard part, and the algorithm cannot help you directly.

- You might think: just pick the `k` with the lowest inertia.
- That does not work. Inertia always falls as `k` grows.
- At the extreme, give every point its own group and inertia is zero. Useless.

### What is the elbow method?

The `elbow method` is **running k-means for many values of k and plotting inertia for each.**

<div data-blog-animation="elbow-chart"><img src="/assets/elbow-method.png" alt="Illustrative elbow-method curve: inertia falls quickly for early k values, then flattens. Not measured data."></div>

- At first, adding a group makes a big difference, and inertia drops fast.
- Past a certain point, extra groups only slice up clumps that were already tight, and the curve flattens.
- The bend where it flattens looks like an elbow. That `k` is a good candidate.

The elbow is a hint, not a rule. A silhouette score is another tool that helps you decide.

## When does k-means fail?

K-means pictures every group as a round blob of roughly the same size, because it works by distance to one center.

- Two long, curved crescents? It will cut them wrong.
- One huge group next to a tiny one? It tends to split the huge one.
- Stray points far from everyone? It still forces them into a group.
- It will not warn you. It returns confident groups either way.

That is why other clustering algorithms exist. They define "a group" differently.

## What other clustering algorithms are there?

K-means is one idea: **a group is whatever surrounds a center.** Two other popular ideas are below.

### What is DBSCAN?

`DBSCAN` is **an algorithm that finds groups as crowded regions, with no centers at all.**

Think of a map of houses. A town is a place where houses are packed close together. A lone farmhouse miles away is not part of any town.

- Start at any point and look at its neighbors within a small radius.
- If there are enough neighbors, it is part of a crowded region, so the region spreads to each neighbor and keeps growing.
- Where the crowd thins out, the group ends.
- Points that never join a crowded region are left alone as `noise`.

What this gives you:

- **Any shape.** A curved crescent is just a crowd that bends, so it can be followed.
- **No `k` needed.** The number of groups falls out of how many crowded regions exist.
- **Outliers handled.** Lonely points are labeled noise instead of being forced into a group.

The trade-off: you now choose the radius and the "how crowded is crowded" threshold instead of `k`.

<div data-blog-animation="dbscan"><img src="/assets/dbscan-poster.svg" alt="Illustrative DBSCAN: expand through core points, add border points, leave isolated points as noise."></div>

<div data-blog-animation="crescent-comparison"><img src="/assets/crescent-comparison-poster.png" alt="Computed example on made-up crescent points: k-means cuts across the curved groups; DBSCAN follows each crescent and leaves two noise points."></div>

### What is hierarchical clustering?

`Hierarchical clustering` is **an algorithm that builds a family tree of groups, from every point alone up to everything together.**

Try it on our six numbers: `1, 2, 4, 9, 10, 12`. Here "distance between groups" means the distance between their closest two members.

1. Every number starts as its own group.
2. Merge the closest pair. `1` and `2` are 1 apart, and so are `9` and `10`. Merge both.
3. Next closest: `4` is 2 away from `2`, and `12` is 2 away from `10`. Merge them in.
4. Now two groups remain, `1, 2, 4` and `9, 10, 12`, and the closest members are 5 apart. Merge them into one.

The tree you just drew is called a `dendrogram`. Its branch heights show how far apart things were when they merged.

<div data-blog-animation="hierarchical"><img src="/assets/hierarchical-poster.svg" alt="Single-linkage dendrogram for 1, 2, 4, 9, 10, 12, with merge heights 1, 2 and 5."></div>

- Slice the tree low, and you get many small groups.
- Slice it between the 2-apart merges and the 5-apart merge, and you get exactly the two groups k-means found.
- Slice it high, and everything is one group.

So you pick the number of groups **after** seeing the tree, not before.

### How do the three compare?

- **K-means:** a group is a crowd around a center. Fast and simple. You choose `k`. Expects round blobs.
- **DBSCAN:** a group is a crowded region. Any shape, ignores noise. You choose the radius and crowding threshold.
- **Hierarchical:** a group is a branch of a tree. Shows the nesting at every level. You choose where to cut.

If you are unsure, start with k-means, look at the result, and try another one if the groups look wrong.

## Why must you scale your features?

Since everything runs on distance, the units of your measurements matter a lot.

- Say each person has an age (about 20 to 60) and a yearly income (thousands or lakhs).
- A difference of 10,000 in income swamps a difference of 10 in age.
- The algorithm effectively ignores age without telling you.

**Scale your features to a comparable range before clustering.** Otherwise the biggest numbers decide the groups.

## How do you use k-means in code?

In scikit-learn, create a `KMeans` object with your `k`, then call `fit` on your data.

```python
from sklearn.cluster import KMeans

kmeans = KMeans(n_clusters=3, random_state=42)
kmeans.fit(X)

group_ids = kmeans.labels_
centers = kmeans.cluster_centers_
score = kmeans.inertia_
```

### What does each line do?

- `KMeans(n_clusters=3, random_state=42)` sets `k` to 3. `random_state=42` fixes the random seed so you get the same result each run.
- `kmeans.fit(X)` runs the assign-then-move loop on your data `X` until it converges. There is no `y`, because there are no answers.
- `kmeans.labels_` is the group number for every point.
- `kmeans.cluster_centers_` holds the final centroids.
- `kmeans.inertia_` is the inertia score. Loop over several `k` values and plot this to get your elbow chart.

<div data-blog-animation="clustering-flow"><img src="/assets/flow-poster.png" alt="Prepare and scale inputs, choose a clustering method, inspect the groups, then interpret them using domain context."></div>

## What are the common mistakes?

- Picking `k` because it feels right, without checking an elbow plot or silhouette score.
- Treating the group numbers as meaning something. Group 2 is not "better" than group 0. You have to look inside each group and name it yourself.
- Skipping feature scaling.
- Trusting one run. Different starts can give different groups.
- Using k-means on crescent-shaped or very uneven data, when DBSCAN or hierarchical clustering would fit better.

## What are the key takeaways?

- Clustering is unsupervised. There are no labels or correct answers to learn from.
- It groups points that sit close together, usually by straight-line distance.
- K-means alternates two steps: send each point to its nearest centroid, then move each centroid to the average of its points. It repeats until nothing changes.
- You choose `k`. Inertia plus the elbow method helps, but it is a judgment call.
- K-means expects round, similar-sized groups. DBSCAN finds crowded regions of any shape and sets noise aside. Hierarchical clustering builds a tree you cut wherever you like.
- Scale your features first, and give meaning to the groups yourself afterwards.

## What might an interviewer ask?

### Why can't you just pick the k with the lowest inertia?

- Inertia always shrinks as `k` grows.
- With one group per point it hits zero, but the groups say nothing.
- So you look for the elbow, where extra groups stop paying off.

### Why does k-means give different answers on different runs?

- The starting centroids are random, and a bad start can settle into worse groups.
- `k-means++` spreads the starts out to reduce this.
- Running it several times and keeping the lowest inertia helps further.

### What is the difference between k-means, DBSCAN and hierarchical clustering?

- K-means groups points around centers. You choose `k` and it expects round blobs.
- DBSCAN groups points in crowded regions. It handles any shape and marks isolated points as noise.
- Hierarchical clustering builds a tree of nested groups, and you cut it to get the number of groups you want.

### Why does k-means need scaled features?

- It decides everything by distance.
- A feature with large numbers, like income, dominates one with small numbers, like age.
- Scaling puts the features on a comparable range.

## Where should you go next?

Try it by hand first. You can run k-means with a pen and paper.

- Write down the minutes you studied on each of your last 8 days.
- Pick `k = 2`, and choose any two of those days as your starting centroids.
- Assign every day to the nearer centroid, then replace each centroid with the average of its days.
- Repeat until no day switches groups.
- Now try `k = 3` and notice how the groups change.

Then go deeper:

- [k-means clustering (Wikipedia)](https://en.wikipedia.org/wiki/K-means_clustering) - for the full math
- [Visualizing K-Means Clustering (Naftali Harris)](https://www.naftaliharris.com/blog/visualizing-k-means-clustering/) - to watch the loop run and see bad starts
- [DBSCAN (Wikipedia)](https://en.wikipedia.org/wiki/DBSCAN) - for how crowded regions grow
- [Hierarchical clustering (Wikipedia)](https://en.wikipedia.org/wiki/Hierarchical_clustering) - for dendrograms and merge rules
- [scikit-learn: Clustering guide](https://scikit-learn.org/stable/modules/clustering.html) - for the code, with all three algorithms side by side

A cluster is just a group of points that sit close together. For k-means, the loop is simple: guess the centers, assign points, move the centers.

### until the next one, keep noticing patterns.
