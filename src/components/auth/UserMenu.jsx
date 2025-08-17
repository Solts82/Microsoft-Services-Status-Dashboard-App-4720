import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { signOut } from '../../lib/supabase';

const { FiUser, FiLogOut, FiSettings, FiBell, FiChevronDown } = FiIcons;

const UserMenu = ({ user, onOpenProfile, onOpenAlertSettings, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      onLogout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleOpenProfile = () => {
    setIsOpen(false);
    onOpenProfile();
  };

  const handleOpenAlertSettings = () => {
    setIsOpen(false);
    onOpenAlertSettings();
  };

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/90 hover:bg-white rounded-lg transition-colors border border-gray-200 shadow-sm"
      >
        <div className="w-7 h-7 bg-microsoft-blue rounded-full flex items-center justify-center">
          <SafeIcon icon={FiUser} className="text-white text-sm" />
        </div>
        <span className="font-medium text-gray-700 hidden sm:inline-block">
          {user?.email?.split('@')[0]}
        </span>
        <SafeIcon 
          icon={FiChevronDown} 
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[9999]"
          >
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
            </div>

            <div className="p-1">
              <button
                onClick={handleOpenProfile}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-left"
              >
                <SafeIcon icon={FiUser} className="text-gray-500" />
                Profile
              </button>

              <button
                onClick={handleOpenAlertSettings}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-left"
              >
                <SafeIcon icon={FiBell} className="text-gray-500" />
                Alert Subscriptions
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"
              >
                <SafeIcon icon={FiLogOut} className="text-red-500" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;