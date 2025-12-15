import { OtelConfig, EventLoopStats } from './types';

/**
 * OpenTelemetry integration manager
 * Provides optional span annotation without hard dependencies
 */
export class OtelIntegration {
  private config: OtelConfig;
  private api: any;
  private tracer: any;

  constructor(config: OtelConfig = {}) {
    this.config = {
      annotateSpan: config.annotateSpan !== false, // default true
      emitSpan: config.emitSpan === true, // default false
    };

    try {
      // Try to load OpenTelemetry API if available
      this.api = require('@opentelemetry/api');
      this.tracer = this.api.trace.getTracer('@mieweb/loopwatch');
    } catch (error) {
      // OTel not available, features disabled
      this.api = null;
      this.tracer = null;
    }
  }

  /**
   * Annotate the current active span with event loop statistics
   */
  annotateCurrentSpan(stats: EventLoopStats, warning: boolean): void {
    if (!this.api || !this.config.annotateSpan) return;

    const span = this.api.trace.getActiveSpan();
    if (!span) return;

    span.setAttributes({
      'eventloop.delay.p50': stats.p50,
      'eventloop.delay.p95': stats.p95,
      'eventloop.delay.p99': stats.p99,
      'eventloop.delay.max': stats.max,
      'eventloop.utilization': stats.elu,
      'eventloop.backpressure': warning,
    });
  }

  /**
   * Emit a diagnostic span for sustained backpressure
   */
  emitDiagnosticSpan(stats: EventLoopStats, consecutiveCount: number): void {
    if (!this.tracer || !this.config.emitSpan) return;

    const span = this.tracer.startSpan('event_loop_backpressure', {
      attributes: {
        'eventloop.delay.p50': stats.p50,
        'eventloop.delay.p95': stats.p95,
        'eventloop.delay.p99': stats.p99,
        'eventloop.delay.max': stats.max,
        'eventloop.utilization': stats.elu,
        'eventloop.consecutive_breaches': consecutiveCount,
      },
    });

    // End span immediately - this is just for signaling
    span.end();
  }

  /**
   * Check if OTel integration is enabled
   */
  isEnabled(): boolean {
    return this.api !== null;
  }
}
