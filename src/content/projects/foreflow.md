---
title: Foreflow
summary: Event-driven automation for prediction markets, matching live Polymarket and Kalshi data against trigger workflows in real time.
start: 2026-06-01
end: 2026-07-31
tags: [Go, NATS, Kubernetes, Postgres, Prometheus, Next.js]
repo: https://github.com/shreyasprasad14/Foreflow
---

## The problem

Prediction markets move fast and in many places at once. Watching a handful of markets by hand works; watching hundreds for "tell me when this crosses 60¢" doesn't. Foreflow lets you define that as a workflow (a market, a trigger, an action) and evaluates every workflow against live market data as it arrives.

Two things make that harder than it sounds. The exchanges don't agree on anything: Polymarket streams order-book updates over a websocket, while Kalshi is polled over REST. And some triggers need memory. "Price crosses 60¢" is only true relative to the previous price, so the system has to keep per-market state consistent while it scales out.

## Architecture

![Foreflow ingestion: Polymarket and Kalshi feed an ingestor, which publishes to NATS shards consumed by one evaluator per shard, which fire alerts and write an audit log to Postgres](/diagrams/foreflow.svg)

- **Ingestion.** One small, unsharded service holds the exchange connections and normalizes both feeds into a common `MarketUpdate`. Exchange connections aren't the bottleneck, so this stays simple.
- **The bus.** Each update is published to NATS on `market.shard.N`, where `N = hash(MarketID) % NUM_SHARDS`.
- **Evaluation.** Each evaluator replica subscribes to exactly one shard, reloads active workflows from Postgres every 15 seconds, and matches incoming updates against them.
- **Actions.** Matches go to a bounded worker pool with panic recovery, which runs the alert and writes a `workflow_runs` audit row.
- **Product.** A Go API serves workflow CRUD and execution history, and a Next.js front end gives a low-code workflow builder.

## The hard parts

### Normalizing two very different feeds

A websocket stream and a REST poller produce different shapes on different schedules. Everything downstream depends on them looking the same, so normalization happens once, at the edge, into `MarketUpdate`. The evaluator never knows which exchange an update came from.

### Scaling out without losing per-market state

`price_crosses` needs the last price seen for a market. If updates for one market could land on any replica, that state would be split and crossings would be missed or double-fired. Sharding by `MarketID` hash means a given market always lands on the same evaluator, so its `lastByMarket` state lives in one place.

To make shard ownership stable, evaluators run as a Kubernetes StatefulSet and parse their shard index from the pod ordinal in `$HOSTNAME`. The HPA is capped at `NUM_SHARDS` replicas, because a pod with an ordinal past that would have no shard to own.

### Keeping the hot path observable

Every service exposes Prometheus metrics for queue depth, trigger-evaluation latency, websocket reconnects and publish counts. That's how backlog is judged under load: queue depth should rise and fall, not grow without bound.

## Results

The design target is <span class="metric">10K events/sec</span>, and the load generator publishes synthetic `MarketUpdate`s straight onto NATS at a configurable rate. Against a single-shard Docker Compose stack, it held <span class="metric">~2K events/sec</span> with zero errors and queue depth returning to zero. The full 10K run against the eight-shard Kubernetes deployment, with the HPA scaled out, hasn't been exercised yet: it needs a cluster to apply the manifests to.

## What I'd do next

- Run the 10K events/sec load test on a real cluster with `NUM_SHARDS=8` and record evaluation latency at the tail.
- Add a `PortfolioUpdate` action.
- Add trade execution last, behind an idempotency key, rate limiting and a dry-run flag, since it's the action with the largest blast radius.
