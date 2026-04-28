/**
 * @mieweb/loopwatch - Node.js Event Loop Watchdog
 * 
 * A reusable Node.js event loop watchdog package that detects sustained
 * event-loop backpressure and exports signals compatible with Prometheus,
 * OpenTelemetry, and PMM-style host correlation.
 */

export { startEventLoopWatchdog, EventLoopWatchdog } from './watchdog';
export {
  WatchdogConfig,
  PrometheusConfig,
  OtelConfig,
  EventLoopStats,
  WarningInfo,
  Watchdog,
} from './types';
