import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { formatDistanceToNow } from 'date-fns';

const { FiActivity, FiCheckCircle, FiAlertCircle, FiClock, FiTrendingUp, FiDatabase } = FiIcons;

const MonitoringStatus = ({ status, className = '' }) => {
  if (!status) return null;

  const getStatusConfig = () => {
    switch (status.status) {
      case 'active':
        return {
          icon: FiCheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-800'
        };
      case 'inactive':
        return {
          icon: FiAlertCircle,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800'
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

  const config = getStatusConfig();
  const lastRunStats = status.lastRunStats;

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
              <SafeIcon icon={config.icon} className={`${config.color} text-lg`} />
              <span className={`text-sm font-medium ${config.color}`}>
                Monitoring System
              </span>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.badge}`}>
              {status.status.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-600">
            {status.lastRun && (
              <div className="flex items-center gap-1">
                <SafeIcon icon={FiClock} />
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

        {status.message && (
          <p className={`mt-2 text-sm ${config.color}`}>
            {status.message}
          </p>
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
      </div>
    </motion.div>
  );
};

export default MonitoringStatus;