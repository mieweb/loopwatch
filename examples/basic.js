/**
 * Basic Example - Simple watchdog usage
 * 
 * Run: node examples/basic.js
 */

const { startEventLoopWatchdog } = require('../dist/index');

// Start the watchdog with default settings
const watchdog = startEventLoopWatchdog({
  sampleMs: 1000,
  lagP95WarnMs: 75,
  eluWarn: 0.9,
  consecutive: 5,
  onWarning(info) {
    console.warn('⚠️  EVENT LOOP BACKPRESSURE DETECTED');
    console.warn('Message:', info.message);
    console.warn('Statistics:', {
      p50: `${info.stats.p50.toFixed(2)}ms`,
      p95: `${info.stats.p95.toFixed(2)}ms`,
      p99: `${info.stats.p99.toFixed(2)}ms`,
      max: `${info.stats.max.toFixed(2)}ms`,
      elu: `${(info.stats.elu * 100).toFixed(1)}%`,
    });
    console.warn('Consecutive breaches:', info.consecutiveCount);
    console.warn('---');
  }
});

console.log('✓ Watchdog started');
console.log('Monitoring event loop health...');
console.log('Press Ctrl+C to stop\n');

// Simulate some work to show the watchdog in action
let counter = 0;
setInterval(() => {
  const stats = watchdog.getStats();
  if (stats) {
    console.log(`[${new Date().toISOString()}] Event loop stats:`, {
      p95: `${stats.p95.toFixed(2)}ms`,
      elu: `${(stats.elu * 100).toFixed(1)}%`,
    });
  }
  counter++;
  
  // After 30 seconds, trigger some load to demonstrate backpressure detection
  if (counter === 30) {
    console.log('\n🔥 Simulating heavy load...\n');
    // Simulate blocking operation (don't do this in real code!)
    setInterval(() => {
      const start = Date.now();
      while (Date.now() - start < 50) {
        // Blocking operation
      }
    }, 100);
  }
}, 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping watchdog...');
  watchdog.stop();
  console.log('✓ Watchdog stopped');
  process.exit(0);
});
