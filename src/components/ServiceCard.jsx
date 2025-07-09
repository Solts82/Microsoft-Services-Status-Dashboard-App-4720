import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AlertItem from './AlertItem';

const { FiCheckCircle, FiAlertCircle, FiXCircle, FiClock } = FiIcons;

const ServiceCard = ({ service, onAlertClick }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return { icon: FiCheckCircle, color: 'text-green-500', bg: 'bg-green-50' };
      case 'degraded':
        return { icon: FiAlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50' };
      case 'outage':
        return { icon: FiXCircle, color: 'text-red-500', bg: 'bg-red-50' };
      default:
        return { icon: FiClock, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  const getServiceIcon = (serviceId) => {
    switch (serviceId) {
      case 'azure':
        return '☁️';
      case 'entra':
        return '🔐';
      case 'microsoft365':
        return '📧';
      default:
        return '⚙️';
    }
  };

  const statusInfo = getStatusIcon(service.status);
  const hasAlerts = service.alerts && service.alerts.length > 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden service-card"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getServiceIcon(service.id)}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {service.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${statusInfo.color.replace('text-', 'bg-')}`} />
                <span className="text-sm text-gray-600 capitalize">
                  {service.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
            <SafeIcon icon={statusInfo.icon} className={`text-xl ${statusInfo.color}`} />
          </div>
        </div>

        {hasAlerts ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">
                Active Alerts ({service.alerts.length})
              </h4>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {service.alerts.map((alert) => (
                <AlertItem 
                  key={alert.id} 
                  alert={alert} 
                  onClick={() => onAlertClick(alert)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <SafeIcon icon={FiCheckCircle} className="text-green-500 text-xl" />
            </div>
            <p className="text-sm text-gray-600">No active alerts</p>
            <p className="text-xs text-gray-500 mt-1">All systems operational</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ServiceCard;