import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { subscribeToAlerts, getAlertSubscriptions } from '../../lib/supabase';

const { FiX, FiBell, FiSave, FiAlertCircle, FiCheckCircle, FiMapPin, FiGlobe } = FiIcons;

// Available regions for subscription
const AVAILABLE_REGIONS = [
  { id: 'global', name: 'Global', icon: FiGlobe },
  { id: 'us-east', name: 'US East', icon: FiMapPin },
  { id: 'us-west', name: 'US West', icon: FiMapPin },
  { id: 'europe', name: 'Europe', icon: FiMapPin },
  { id: 'asia-pacific', name: 'Asia Pacific', icon: FiMapPin },
  { id: 'south-america', name: 'South America', icon: FiMapPin },
  { id: 'australia', name: 'Australia', icon: FiMapPin },
  { id: 'canada', name: 'Canada', icon: FiMapPin },
  { id: 'uk', name: 'United Kingdom', icon: FiMapPin },
  { id: 'india', name: 'India', icon: FiMapPin },
];

const AlertSubscriptionModal = ({ isOpen, onClose, user }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      loadSubscriptions();
    }
  }, [isOpen, user]);

  const loadSubscriptions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await getAlertSubscriptions(user.id);
      if (error) throw error;

      if (data && data.regions) {
        setSelectedRegions(data.regions || []);
      } else {
        // Default to Global if no subscriptions exist
        setSelectedRegions(['global']);
      }
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      // Default to Global on error
      setSelectedRegions(['global']);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegion = (regionId) => {
    if (selectedRegions.includes(regionId)) {
      // Don't allow removing the last region
      if (selectedRegions.length === 1) return;
      setSelectedRegions(prev => prev.filter(id => id !== regionId));
    } else {
      setSelectedRegions(prev => [...prev, regionId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await subscribeToAlerts(user.id, selectedRegions);
      if (error) throw error;

      setSuccess('Alert subscriptions updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update alert subscriptions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden z-[10000]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <SafeIcon icon={FiBell} className="text-xl text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Alert Subscriptions
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <SafeIcon icon={FiX} className="text-xl text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-microsoft-blue"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <SafeIcon icon={FiAlertCircle} className="flex-shrink-0 text-red-500" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                    <SafeIcon icon={FiCheckCircle} className="flex-shrink-0 text-green-500" />
                    <p className="text-sm">{success}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Choose the regions you want to receive alert notifications for. Alerts will be sent to your email address.
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    From: alert@microsoftservicealert.com
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Regions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_REGIONS.map(region => (
                      <div
                        key={region.id}
                        onClick={() => toggleRegion(region.id)}
                        className={`
                          flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors
                          ${selectedRegions.includes(region.id)
                            ? 'bg-blue-100 border border-blue-200 text-blue-800'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <SafeIcon
                          icon={region.icon}
                          className={selectedRegions.includes(region.id) ? 'text-blue-600' : 'text-gray-500'}
                        />
                        <span className="text-sm font-medium">{region.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-microsoft-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-microsoft-blue disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <SafeIcon icon={FiSave} />
                        <span>Save Preferences</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AlertSubscriptionModal;