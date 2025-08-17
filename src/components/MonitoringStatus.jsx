import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { formatDistanceToNow } from 'date-fns';
import { startRealTimeMonitoring, stopRealTimeMonitoring, runMonitoringNow } from '../services/microsoftApi';

const { FiActivity, FiCheckCircle, FiAlertCircle, FiClock, FiTrendingUp, FiDatabase, FiPlay, FiPause, FiRefreshCw } = FiIcons;

const MonitoringStatus = ({ status, className = '', onStatusChange }) => {
  const [loading, setLoading] = React.useState(false);

  if (!status) return null;

  const getStatusConfig = () => {
    switch (status.status) {
      case 'active':
        return {
          icon: FiActivity,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-800'
        };
      case 'inactive':
        return {
          icon: FiPause,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'stopped':
      case 'never_run':
        return {
          icon: FiClock,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          badge: 'bg-gray-100 text-gray-800'
        };
      case 'error':
        return {
          icon: FiAlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800'
        };
      default:
        return {
          icon: FiClock,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const handleStartMonitoring = async () => {
    setLoading(true);
    try {
      const result = startRealTimeMonitoring();
      console.log('Start monitoring result:', result);
      
      // Trigger a refresh of the parent component
      if (onStatusChange) {
        setTimeout(() => {
          onStatusChange();
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setLoading(true);
    try {
      const result = stopRealTimeMonitoring();
      console.log('Stop monitoring result:', result);
      
      // Trigger a refresh of the parent component
      if (onStatusChange) {
        setTimeout(() => {
          onStatusChange();
        }, 1000);
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunNow = async () => {
    setLoading(true);
    try {
      const result = await runMonitoringNow();
      console.log('Run now result:', result);
      
      // Trigger a refresh of the parent component
      if (onStatusChange) {
        setTimeout(() => {
          onStatusChange();
        }, 2000);
      }
    } catch (error) {
      console.error('Error running monitoring now:', error);
    } finally {
      setLoading(false);
    }
  };

  const config = getStatusConfig();
  const lastRunStats = status.lastRunStats;
  const isRunning = status.isRunning || status.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}
    >
      <div className={`p-4 border-l-4 ${config.border} ${config.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <SafeIcon 
                icon={config.icon} 
                className={`${config.color} text-lg ${isRunning ? 'animate-pulse' : ''}`} 
              />
              <span className={`text-sm font-medium ${config.color}`}>
                Real-Time Monitoring System
              </span>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.badge}`}>
              {status.status.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Control buttons */}
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <button
                  onClick={handleStartMonitoring}
                  disabled={loading}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-1"
                >
                  <SafeIcon icon={loading ? FiRefreshCw : FiPlay} className={loading ? 'animate-spin' : ''} />
                  <span>{loading ? 'Starting...' : 'Start'}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleRunNow}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-1"
                  >
                    <SafeIcon icon={loading ? FiRefreshCw : FiRefreshCw} className={loading ? 'animate-spin' : ''} />
                    <span>{loading ? 'Running...' : 'Run Now'}</span>
                  </button>
                  <button
                    onClick={handleStopMonitoring}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-1"
                  >
                    <SafeIcon icon={FiPause} />
                    <span>Stop</span>
                  </button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-600">
              {isRunning && (
                <div className="flex items-center gap-1">
                  <SafeIcon icon={FiClock} />
                  <span>Every 60 seconds</span>
                </div>
              )}
              {status.lastRun && (
                <div className="flex items-center gap-1">
                  <SafeIcon icon={FiCheckCircle} />
                  <span>Last run: {formatDistanceToNow(status.lastRun)} ago</span>
                </div>
              )}
              {lastRunStats && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <SafeIcon icon={FiDatabase} />
                    <span>{lastRunStats.alertsFound} found</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <SafeIcon icon={FiTrendingUp} />
                    <span>{lastRunStats.alertsUpdated} updated</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <SafeIcon icon={FiCheckCircle} />
                    <span>{lastRunStats.alertsResolved} resolved</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {status.message && (
          <p className={`mt-2 text-sm ${config.color}`}>
            {status.message}
          </p>
        )}

        {status.status === 'active' && status.consecutiveErrors > 0 && (
          <div className="mt-2 text-xs text-yellow-600">
            <span>⚠️ {status.consecutiveErrors} consecutive errors</span>
          </div>
        )}

        {lastRunStats && lastRunStats.errors && lastRunStats.errors.length > 0 && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="font-medium text-red-800 mb-1">Recent Errors:</div>
            {lastRunStats.errors.slice(0, 3).map((error, index) => (
              <div key={index} className="text-red-700">• {error}</div>
            ))}
          </div>
        )}

        {lastRunStats && lastRunStats.duration && (
          <div className="mt-2 text-xs text-gray-500">
            Last cycle completed in {lastRunStats.duration}ms
          </div>
        )}

        {(status.status === 'never_run' || status.status === 'stopped') && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <SafeIcon icon={FiPlay} />
              <span>Click "Start" to begin real-time monitoring of Microsoft services</span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              ℹ️ This will simulate checking Azure, Microsoft 365, Entra ID, and GitHub services every 60 seconds
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MonitoringStatus;