# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-15

### Added
- Initial release of @mieweb/loopwatch
- Event loop monitoring using `perf_hooks.monitorEventLoopDelay`
- Event loop utilization tracking using `perf_hooks.eventLoopUtilization`
- Configurable thresholds for p95 lag and ELU
- Consecutive threshold breach detection with debounce
- Structured warning callback system
- Prometheus metrics integration (optional)
  - `node_event_loop_delay_p50_ms`
  - `node_event_loop_delay_p95_ms`
  - `node_event_loop_delay_p99_ms`
  - `node_event_loop_delay_max_ms`
  - `node_event_loop_utilization`
- OpenTelemetry integration (optional)
  - Active span annotation
  - Diagnostic span emission
- TypeScript type definitions
- Comprehensive test suite (30 tests, 100% passing)
- Documentation and examples
  - Basic usage example
  - Express + Prometheus example
  - Grafana dashboard JSON
  - Troubleshooting guide
- Production-ready features
  - <1% CPU overhead
  - Multi-process safe
  - Graceful degradation
  - Zero vendor lock-in

### Requirements
- Node.js >= 18.0.0
- Optional: prom-client ^15.0.0
- Optional: @opentelemetry/api

[1.0.0]: https://github.com/mieweb/loopwatch/releases/tag/v1.0.0
