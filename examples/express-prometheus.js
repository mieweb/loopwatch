/**
 * Express + Prometheus Example
 * 
 * Shows how to integrate loopwatch with an Express app and Prometheus
 * 
 * Run: npm install express prom-client
 *      node examples/express-prometheus.js
 * 
 * Then visit:
 * - http://localhost:3000/ - Main app
 * - http://localhost:3000/metrics - Prometheus metrics
 * - http://localhost:3000/load - Trigger load
 */

const express = require('express');
const { startEventLoopWatchdog } = require('../dist/index');
const promClient = require('prom-client');

const app = express();
const port = 3000;

// Create Prometheus registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Start the watchdog with Prometheus integration
const watchdog = startEventLoopWatchdog({
  prometheus: {
    register,
    prefix: 'node',
  },
  lagP95WarnMs: 75,
  consecutive: 5,
  onWarning(info) {
    console.error('[WATCHDOG]', info.message);
    console.error('  - p95 lag:', info.stats.p95.toFixed(2), 'ms');
    console.error('  - ELU:', (info.stats.elu * 100).toFixed(1), '%');
    console.error('  - Consecutive:', info.consecutiveCount);
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Event Loop Watchdog Demo',
    endpoints: {
      '/': 'This page',
      '/metrics': 'Prometheus metrics',
      '/load': 'Trigger CPU load',
      '/stats': 'Current event loop stats',
    }
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Get current stats
app.get('/stats', (req, res) => {
  const stats = watchdog.getStats();
  if (stats) {
    res.json({
      p50: stats.p50,
      p95: stats.p95,
      p99: stats.p99,
      max: stats.max,
      elu: stats.elu,
      timestamp: stats.timestamp,
    });
  } else {
    res.status(503).json({ error: 'Stats not yet available' });
  }
});

// Endpoint to trigger load for testing
app.get('/load', (req, res) => {
  const duration = parseInt(req.query.duration || '5000');
  const intensity = parseInt(req.query.intensity || '50');
  
  console.log(`Triggering load: ${duration}ms duration, ${intensity}ms blocking`);
  
  const endTime = Date.now() + duration;
  const loadInterval = setInterval(() => {
    if (Date.now() >= endTime) {
      clearInterval(loadInterval);
      console.log('Load test completed');
      return;
    }
    
    // Block the event loop
    const start = Date.now();
    while (Date.now() - start < intensity) {
      // Busy wait
    }
  }, 100);
  
  res.json({ 
    message: 'Load triggered',
    duration: `${duration}ms`,
    intensity: `${intensity}ms`,
  });
});

// Start server
app.listen(port, () => {
  console.log(`✓ Server listening on http://localhost:${port}`);
  console.log(`✓ Metrics available at http://localhost:${port}/metrics`);
  console.log(`✓ Watchdog monitoring event loop`);
  console.log('\nTry these commands:');
  console.log(`  curl http://localhost:${port}/metrics | grep node_event_loop`);
  console.log(`  curl http://localhost:${port}/load?duration=10000&intensity=60`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  watchdog.stop();
  process.exit(0);
});
