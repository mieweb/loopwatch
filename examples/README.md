# Examples

This directory contains practical examples of using `@mieweb/loopwatch` in different scenarios.

## Running Examples

1. Build the package first:
   ```bash
   npm run build
   ```

2. Install example dependencies:
   ```bash
   npm install express prom-client
   ```

3. Run an example:
   ```bash
   node examples/basic.js
   node examples/express-prometheus.js
   ```

## Available Examples

### basic.js

Simple standalone usage showing:
- Default configuration
- Warning callback
- Getting current statistics
- Simulated load to trigger backpressure detection

**Run:**
```bash
node examples/basic.js
```

### express-prometheus.js

Express.js application with Prometheus integration:
- Complete web server setup
- Prometheus metrics endpoint
- Load testing endpoint
- Statistics endpoint
- Production-ready patterns

**Run:**
```bash
node examples/express-prometheus.js
```

**Test:**
```bash
# View metrics
curl http://localhost:3000/metrics | grep node_event_loop

# Check current stats
curl http://localhost:3000/stats

# Trigger load to see backpressure detection
curl "http://localhost:3000/load?duration=10000&intensity=60"
```

## Prometheus Scrape Configuration

Add this to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'nodejs-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Grafana Dashboards

### Key Metrics to Visualize

1. **Event Loop Delay (p95)**
   ```promql
   node_event_loop_delay_p95_ms
   ```

2. **Event Loop Utilization**
   ```promql
   node_event_loop_utilization * 100
   ```

3. **Max Delay**
   ```promql
   node_event_loop_delay_max_ms
   ```

### Sample Queries

**Alert on High Delay:**
```promql
node_event_loop_delay_p95_ms > 100
```

**Show Utilization Trend:**
```promql
rate(node_event_loop_utilization[5m]) * 100
```

## Testing Backpressure Scenarios

### Scenario 1: CPU-Bound Operations
```javascript
// Simulate heavy computation
app.get('/fibonacci', (req, res) => {
  const n = parseInt(req.query.n || '40');
  function fib(n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  }
  res.json({ result: fib(n) });
});
```

### Scenario 2: Synchronous I/O
```javascript
// Bad: synchronous file read
app.get('/sync-read', (req, res) => {
  const fs = require('fs');
  const data = fs.readFileSync('/dev/urandom', { length: 1024 * 1024 });
  res.json({ size: data.length });
});
```

### Scenario 3: High Request Volume
```bash
# Use Apache Bench or similar
ab -n 10000 -c 100 http://localhost:3000/
```

## Best Practices

1. **Start Early** - Initialize the watchdog early in your application lifecycle
2. **Log Warnings** - Always implement the `onWarning` callback
3. **Export Metrics** - Enable Prometheus integration for long-term tracking
4. **Set Thresholds** - Tune thresholds based on your application's normal behavior
5. **Test Regularly** - Use the load endpoints to verify alerting works

## Troubleshooting

If the watchdog isn't detecting load:
- Check that thresholds are appropriate for your workload
- Reduce `consecutive` for faster detection
- Increase load intensity in test scenarios
- Verify Node.js version >= 18

If getting false positives:
- Increase `lagP95WarnMs` threshold
- Increase `consecutive` count
- Increase `cooldownMs` period
- Check for GC pauses or other system-level issues
