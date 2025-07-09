import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const { FiAlertTriangle, FiInfo, FiCheckCircle, FiClock, FiChevronRight, FiMessageSquare } = FiIcons;

const AlertItem = ({ alert, onClick }) => {
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
        return { color: 'text-yellow-600', label: 'Investigating' };
      case 'monitoring':
        return { color: 'text-blue-600', label: 'Monitoring' };
      case 'resolved':
        return { color: 'text-green-600', label: 'Resolved' };
      default:
        return { color: 'text-gray-600', label: 'Unknown' };
    }
  };

  const severityConfig = getSeverityConfig(alert.severity);
  const statusConfig = getStatusConfig(alert.status);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-lg border cursor-pointer transition-all alert-item ${severityConfig.bg} ${severityConfig.border} hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <SafeIcon icon={severityConfig.icon} className={`text-lg ${severityConfig.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h5 className="text-sm font-medium text-gray-900 line-clamp-2">
              {alert.title}
            </h5>
            <div className="flex items-center gap-2">
              <Link
                to={`/alert/${alert.id}/comments`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors text-xs font-medium"
              >
                <SafeIcon icon={FiMessageSquare} className="text-xs" />
                <span>Comments</span>
              </Link>
              <button
                onClick={onClick}
                className="p-1 hover:bg-white/70 rounded transition-colors"
              >
                <SafeIcon icon={FiChevronRight} className="text-gray-400 text-sm" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityConfig.badge}`}>
              {alert.severity.toUpperCase()}
            </span>
            <span className={`text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {alert.impact}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Started {formatDistanceToNow(alert.startTime)} ago
            </span>
            {alert.region && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                {alert.region}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AlertItem;