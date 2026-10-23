---
title: agentd
summary: A control plane that runs LLM agents as durable, resumable, sandboxed and observable jobs.
start: 2026-08-01
end: 2026-09-30
tags: [Go, Postgres, pgvector, Docker, OpenTelemetry, MCP]
repo: https://github.com/shreyasprasad14/agentd
---

## The problem

Most agent frameworks run the loop in one process's memory. If that process dies halfway through a run, the run is gone, and worse, you can't tell which side effects already happened. A tool call that sent an email or wrote a file may run again when you retry. For agents to do real work, a run has to survive the machine it started on.

agentd treats an agent run like any other durable job. A run is an append-only event log in Postgres, and the agent loop is a state machine driven by that log. Sandboxing, budgets, retrieval, tracing and the eval harness are all built on that one property.

## Architecture

![agentd architecture: client, API server, Postgres, two workers, and the model, sandbox and MCP servers they call](/diagrams/agentd.svg)

The API server never calls a model. It writes intent (a new run) and streams the event log back over SSE. Workers claim runs with `SELECT … FOR UPDATE SKIP LOCKED`, hold a lease while they work, and call `Reduce` over the run's events on every iteration, not only on resume. So the path a fresh worker takes to pick up a crashed run is the path every step of every run takes. The recovery path can't rot, because it's the only path.

## The hard parts

### Exactly-once tool calls across a `kill -9`

Three mechanisms, each answering one question:

- **Leases:** who owns this run? A reaper returns lapsed leases to the queue, which is how a dead worker's run becomes claimable again.
- **Fencing:** is this writer still the owner? Every write re-checks the lease in the same transaction, so a stalled worker that wakes up after losing its lease is refused instead of corrupting a log someone else now owns.
- **An idempotency ledger:** did this side effect already happen? Each tool call gets a row keyed by the sequence number of its `tool_requested` event, and the result row commits together with the `tool_succeeded` event.

Model calls get the opposite treatment on purpose. `model_requested` is written before the call, so a crash mid-call leaves a dangling request that the next worker simply repeats. Model calls are at-least-once and tool calls are exactly-once, because one is safe to repeat and the other may not be.

The crash demo proves it end to end: start worker A, wait for the second tool call to begin, `kill -9` it, start worker B. Worker B finishes the interrupted call and the run, and the event log shows the first tool call never ran twice. Because the trace ID is minted at submission and stored on the run row, both workers' spans land in one Jaeger trace, and the crash shows up as the span that never closed.

### Retrieval that measures before it claims

`search_corpus` is hybrid retrieval over 2,484 Supreme Court opinions (70,736 chunks): pgvector HNSW for semantic matches, a lexical ranker for exact terms, fused with reciprocal rank fusion and optionally reranked by an LLM.

The first lexical ranker was Postgres's `ts_rank_cd`, which weighs every word the same. On a query like "Baxter v. Palmigiano adverse inference", the top nine hits were string citations repeating `v.`, which appears in 49% of chunks, and none of them contained `palmigiano`, which appears in ten. Replacing the ranking with Okapi BM25, computed in SQL against corpus statistics that ingest refreshes, took case-name recall@8 from <span class="metric">0.22 → 0.83</span>.

The same eval showed something less flattering: on case-name queries, fusion drags hybrid recall@8 down to 0.67, between its two inputs, because RRF weighs both lists by rank alone and can't tell which one to trust for a given query. That cost is now measured, not assumed.

### A sandbox that treats failure as data

Every `run_python` call runs in a fresh container with no network, a read-only root filesystem, all capabilities dropped, a non-root user, and memory and process limits. A script that exits nonzero, runs out of memory or times out is a successful tool call whose result says it failed, so the model sees the traceback and can fix its own code. In one recorded run, the model's first script imported `dateutil`, got a `ModuleNotFoundError` back from the stdlib-only sandbox, rewrote it with `datetime` alone and finished correctly.

## Results

- **Crash recovery:** an integration test kills a worker mid-run against real Postgres and asserts the run finishes, the completed tool call ran exactly once, and no model call was repeated.
- **Retrieval:** case-name recall@8 went from <span class="metric">0.22 → 0.83</span> with BM25. Across the 40-query paraphrase benchmark, every mode reaches recall@8 of 1.0. The stratified labels are still unreviewed drafts, so per-category numbers carry that caveat.
- **Eval gating:** `make eval-retrieval` exits nonzero below the thresholds in its label file, and the agent eval suite replays recorded trajectories to score retrieval, citations, prompt-injection resistance, sandbox safety, crash recovery and budgets.

## What I'd do next

- Review the 63 draft labels in the stratified retrieval set, since the per-category conclusions depend on them.
- Make fusion query-aware, so a case-name query can lean on BM25 instead of being averaged toward vector search.
- Add human-in-the-loop approval as an `approval_requested` / `approval_granted` event pair that suspends the loop.
