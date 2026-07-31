---
title: Writing a Memory Allocator in C from Scratch
date: 2026-07-14
tags: C, systems, memory
readTime: 8 min
excerpt: malloc() is something we take for granted. Let's break it open.
---

Every C program calls malloc(). But what does malloc() actually do?

I spent last weekend implementing a slab allocator from scratch as part of my OS coursework. Here is what I learned.

The core idea: you maintain a free list. When the user requests N bytes, you walk the list, find a block >= N, split if needed, and hand back a pointer.

The tricky part is coalescing — merging adjacent free blocks so you don't fragment the heap into unusable slivers.

My naive first-fit allocator passed 18/20 test cases. The two failures were edge cases around page-aligned allocations. Fixed by rounding up to the next 4096-byte boundary using (size + 4095) & ~4095.

Full source: github.com/dev/malloc-from-scratch
