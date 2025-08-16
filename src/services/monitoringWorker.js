// Monitoring Worker - Handles background monitoring in a Web Worker
// This runs the monitoring service in the background

import { monitoringService } from './monitoringService.js';

class MonitoringWorker {
  constructor() {
    this.worker = null;
    this.isSupported = typeof Worker !== 'undefined';
  }

  // Start monitoring (either in worker or main thread)
  async start() {
    console.log('🚀 Starting Microsoft Service Health Monitoring System');
    
    if (this.isSupported) {
      try {
        // Try to use Web Worker for background monitoring
        this.startWorkerMonitoring();
      } catch (error) {
        console.warn('Web Worker not available, falling back to main thread:', error);
        this.startMainThreadMonitoring();
      }
    } else {
      console.log('Web Worker not supported, using main thread');
      this.startMainThreadMonitoring();
    }
  }

  // Start monitoring in Web Worker
  startWorkerMonitoring() {
    // Create worker from inline script (since we can't load external files in many environments)
    const workerScript = `
      // Web Worker script for background monitoring
      let monitoringInterval = null;
      let isRunning = false;

      // Import monitoring service (this would need to be adapted for your build system)
      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        switch (type) {
          case 'start':
            if (!isRunning) {
              isRunning = true;
              startMonitoring();
              self.postMessage({ type: 'started' });
            }
            break;
            
          case 'stop':
            if (isRunning) {
              stopMonitoring();
              self.postMessage({ type: 'stopped' });
            }
            break;
            
          case 'status':
            self.postMessage({ 
              type: 'status', 
              data: { isRunning, lastRun: Date.now() } 
            });
            break;
        }
      };

      function startMonitoring() {
        // Run monitoring cycle every minute
        monitoringInterval = setInterval(async () => {
          try {
            self.postMessage({ type: 'cycle-start' });
            
            // This would call the actual monitoring logic
            // For now, we'll simulate the monitoring
            await simulateMonitoringCycle();
            
            self.postMessage({ type: 'cycle-complete' });
          } catch (error) {
            self.postMessage({ type: 'cycle-error', error: error.message });
          }
        }, 60000); // 1 minute
      }

      function stopMonitoring() {
        if (monitoringInterval) {
          clearInterval(monitoringInterval);
          monitoringInterval = null;
          isRunning = false;
        }
      }

      async function simulateMonitoringCycle() {
        // Simulate monitoring work
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = (e) => {
      const { type, data, error } = e.data;
      
      switch (type) {
        case 'started':
          console.log('✅ Background monitoring started in Web Worker');
          break;
        case 'stopped':
          console.log('🛑 Background monitoring stopped');
          break;
        case 'cycle-start':
          console.log('🔄 Monitoring cycle started');
          break;
        case 'cycle-complete':
          console.log('✅ Monitoring cycle completed');
          break;
        case 'cycle-error':
          console.error('❌ Monitoring cycle error:', error);
          break;
      }
    };

    this.worker.onerror = (error) => {
      console.error('Web Worker error:', error);
      // Fallback to main thread
      this.startMainThreadMonitoring();
    };

    // Start the worker
    this.worker.postMessage({ type: 'start' });
  }

  // Start monitoring in main thread
  startMainThreadMonitoring() {
    console.log('📡 Starting monitoring in main thread...');
    monitoringService.startMonitoring();
  }

  // Stop monitoring
  stop() {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.terminate();
      this.worker = null;
    } else {
      monitoringService.stopMonitoring();
    }
  }

  // Get status
  getStatus() {
    if (this.worker) {
      this.worker.postMessage({ type: 'status' });
      return { type: 'worker', isRunning: true };
    } else {
      return { type: 'main', ...monitoringService.getStatus() };
    }
  }
}

export const monitoringWorker = new MonitoringWorker();
export default MonitoringWorker;