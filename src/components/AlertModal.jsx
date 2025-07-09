import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { format, formatDistanceToNow } from 'date-fns';

const { FiX, FiClock, FiMapPin, FiAlertTriangle, FiInfo, FiCheckCircle, FiUsers } = FiIcons;

const AlertModal = ({ alert, onClose }) => {
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

  const getStatusConfig = (status) => {
    switch (status) {
      case 'investigating':
        return { color: 'text-yellow-600', label: 'Investigating', icon: FiClock };
      case 'monitoring':
        return { color: 'text-blue-600', label: 'Monitoring', icon: FiInfo };
      case 'resolved':
        return { color: 'text-green-600', label: 'Resolved', icon: FiCheckCircle };
      default:
        return { color: 'text-gray-600', label: 'Unknown', icon: FiClock };
    }
  };

  const severityConfig = getSeverityConfig(alert.severity);
  const statusConfig = getStatusConfig(alert.status);
  const isResolved = alert.status === 'resolved';

  const getResolutionTime = () => {
    if (!alert.resolvedTime || !alert.startTime) return null;
    const duration = alert.resolvedTime - alert.startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 border-b border-gray-200 ${isResolved ? 'bg-green-50' : ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${isResolved ? 'bg-green-100' : severityConfig.bg}`}>
                <SafeIcon 
                  icon={isResolved ? FiCheckCircle : severityConfig.icon} 
                  className={`text-2xl ${isResolved ? 'text-green-600' : severityConfig.color}`} 
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {alert.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${severityConfig.badge}`}>
                    {alert.severity.toUpperCase()} SEVERITY
                  </span>
                  <div className={`flex items-center gap-1 text-sm font-medium ${statusConfig.color}`}>
                    <SafeIcon icon={statusConfig.icon} className="text-sm" />
                    {statusConfig.label}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <SafeIcon icon={FiX} className="text-xl text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Impact Description</h3>
              <p className="text-gray-700 leading-relaxed">{alert.impact}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <SafeIcon icon={FiClock} className="text-gray-600" />
                    Timeline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Started:</span>
                      <span className="font-medium">
                        {format(alert.startTime, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {isResolved && alert.resolvedTime && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Resolved:</span>
                          <span className="font-medium text-green-600">
                            {format(alert.resolvedTime, 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Resolution Time:</span>
                          <span className="font-medium">
                            {getResolutionTime()}
                          </span>
                        </div>
                      </>
                    )}
                    {!isResolved && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">
                          {formatDistanceToNow(alert.startTime)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium">
                        {format(alert.lastUpdated, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>

                {alert.region && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <SafeIcon icon={FiMapPin} className="text-gray-600" />
                      Affected Region
                    </h4>
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium">
                      {alert.region}
                    </span>
                  </div>
                )}
              </div>

              {alert.affectedServices && alert.affectedServices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <SafeIcon icon={FiUsers} className="text-gray-600" />
                    Affected Services
                  </h4>
                  <div className="space-y-2">
                    {alert.affectedServices.map((service, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                      >
                        <div className={`w-2 h-2 rounded-full ${isResolved ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-sm text-gray-700">{service}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isResolved && alert.resolutionSummary && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <SafeIcon icon={FiCheckCircle} className="text-green-600" />
                  Resolution Summary
                </h4>
                <p className="text-sm text-green-800 leading-relaxed">
                  {alert.resolutionSummary}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Alert ID: {alert.id}</span>
                <span>Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AlertModal;