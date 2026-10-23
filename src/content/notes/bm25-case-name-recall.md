---
title: "One ranking function took case-name recall from 0.22 to 0.83"
date: 2026-10-23
summary: Why Postgres's ts_rank_cd lost to vector search on exact case names, and what switching to BM25 fixed and didn't.
tags: [retrieval, postgres, agentd]
draft: true
---

<!-- DRAFT: outline from agentd ADR-41. Rewrite in your own voice before setting draft: false. -->

agentd's `search_corpus` tool does hybrid retrieval over 2,484 Supreme Court opinions: vector search for meaning, lexical search for exact terms, fused with reciprocal rank fusion. On case-name queries, the lexical side should have been the strong one. It came last.

## What went wrong

The lexical mode ranked with Postgres's `ts_rank_cd`. It scores how often and how close together a query's words occur, and it weighs every word the same. It has no notion of rarity.

For "Baxter v. Palmigiano adverse inference …", the top nine hits were string citations repeating `v.`, which appears in 49% of chunks. None contained `palmigiano`, which appears in ten. The one chunk that named the case ranked tenth.

## The fix

Keep the GIN-indexed `tsvector` for candidates; replace only the ranking with Okapi BM25 (k1 = 1.2, b = 0.75). The statistics BM25 needs (document frequency per lexeme, chunk length, average length) live in materialized views that ingest refreshes once per run.

| category | n | `ts_rank_cd` recall@8 | BM25 recall@8 |
|---|---|---|---|
| paraphrase | 40 | 0.850 | 1.000 |
| citation | 16 | 0.412 | 0.713 |
| case_name | 17 | 0.217 | 0.831 |
| term_of_art | 15 | 0.251 | 0.460 |
| mixed | 15 | 0.284 | 0.607 |

## What it didn't fix

- Fusion still dilutes BM25 where it's strong: hybrid case-name recall@8 is 0.670, between its inputs.
- The stratified labels are unreviewed drafts, n ≈ 15 per category.
- Two bugs the parity check caught: re-stemmed lexemes producing NULL scores that sorted first, and a window function that was 2.4× slower than a view.

## Takeaways

TODO
