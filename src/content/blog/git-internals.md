---
title: Git Internals: What is a Commit, Really?
date: 2026-06-28
tags: git, internals, tooling
readTime: 6 min
excerpt: Commits are just SHA-1-addressed blobs. Here is the proof.
---

Run: cat .git/HEAD

You will see something like: ref: refs/heads/main

Run: cat .git/refs/heads/main

That is a 40-character SHA-1 hash — a content address pointing to a commit object.

Run: git cat-file -p <that-hash>

You get a tree hash, parent hash, author, committer, and message. That is a commit object in its entirety.

Tree objects point to blob objects (file contents) and other tree objects (subdirectories). It is a Merkle DAG.

This means git checkout is literally: read the tree, decompress the blobs, write them to disk. No magic.

Understanding this made me a dramatically better debugger of merge conflicts.
