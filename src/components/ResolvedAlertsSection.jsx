import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { formatDistanceToNow, format } from 'date-fns';

const { FiCheckCircle, FiClock, FiChevronDown, FiChevronUp, FiInfo, FiAlertTriangle } = FiIcons;

const ResolvedAlertsSection = ({ resolvedAlerts, onAlertClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!resolvedAlerts || resolvedAlerts.length === 0) {
    return null;
  }

  const displayAlerts = showAll ? resolvedAlerts : resolvedAlerts.slice(0, 3);

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'high':
        return {
          icon: FiAlertTriangle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800'
        };
      case 'medium':
        return {
          icon: FiInfo,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'low':
        return {
          icon: FiInfo,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800'
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

  const getResolutionTime = (startTime, resolvedTime) => {
    const duration = resolvedTime - startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiCheckCircle} className="text-green-600 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Recently Resolved Alerts
              </h3>
              <p className="text-sm text-gray-600">
                {resolvedAlerts.length} alert{resolvedAlerts.length !== 1 ? 's' : ''} resolved in the last 24 hours
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              {isExpanded ? 'Hide' : 'Show'} Details
            </span>
            <SafeIcon 
              icon={isExpanded ? FiChevronUp : FiChevronDown} 
              className="text-gray-500"
            />
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {displayAlerts.map((alert, index) => {
                const severityConfig = getSeverityConfig(alert.severity);
                const resolutionTime = getResolutionTime(alert.startTime, alert.resolvedTime);
                
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => onAlertClick(alert)}
                    className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <SafeIcon icon={FiCheckCircle} className="text-green-600 text-lg" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-gray-700">
                            {alert.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityConfig.badge}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                          {alert.impact}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-gray-500 block">Resolved</span>
                            <span className="font-medium text-gray-900">
                              {formatDistanceToNow(alert.resolvedTime)} ago
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Duration</span>
                            <span className="font-medium text-gray-900">
                              {resolutionTime}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Affected Services</span>
                            <span className="font-medium text-gray-900">
                              {alert.affectedServices?.length || 0}
                            </span>
                          </div>
                          {alert.region && (
                            <div>
                              <span className="text-gray-500 block">Region</span>
                              <span className="font-medium text-gray-900">
                                {alert.region}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {alert.resolutionSummary && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                            <h5 className="text-xs font-semibold text-gray-900 mb-1">Resolution Summary</h5>
                            <p className="text-xs text-gray-700">{alert.resolutionSummary}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {resolvedAlerts.length > 3 && (
                <div className="text-center pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAll(!showAll)}
                    className="px-4 py-2 text-sm font-medium text-microsoft-blue hover:text-blue-700 transition-colors"
                  >
                    {showAll ? 'Show Less' : `Show ${resolvedAlerts.length - 3} More`}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ResolvedAlertsSection;