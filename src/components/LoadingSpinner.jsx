import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center p-8 bg-white/80 backdrop-blur-md rounded-xl shadow-lg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-microsoft-blue border-t-transparent rounded-full mx-auto mb-6"
        />
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-semibold text-gray-800 mb-4"
        >
          Loading Microsoft Service Health
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-gray-600 mb-2">
            Fetching real-time status from:
          </p>
          <div className="flex flex-col gap-2 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Azure Status</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
              <span>Microsoft 365 Status</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              <span>Entra ID Status</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingSpinner;