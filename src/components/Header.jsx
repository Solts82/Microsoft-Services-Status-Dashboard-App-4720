import React,{useState} from 'react';
import {motion} from 'framer-motion';
import {Link} from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {formatDistanceToNow} from 'date-fns';
import UserMenu from './auth/UserMenu';
import AuthModal from './auth/AuthModal';
import ProfileModal from './profile/ProfileModal';
import AlertSubscriptionModal from './subscription/AlertSubscriptionModal';

const {FiRefreshCw,FiAlertTriangle,FiShield,FiActivity,FiLogIn,FiSettings}=FiIcons;

const Header=({totalAlerts,criticalAlerts,lastUpdated,onRefresh,loading,user,userRole})=> {
  const [showAuthModal,setShowAuthModal]=useState(false);
  const [authMode,setAuthMode]=useState('login');
  const [showProfileModal,setShowProfileModal]=useState(false);
  const [showAlertSubscriptionModal,setShowAlertSubscriptionModal]=useState(false);

  const handleLogin=()=> {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleRegister=()=> {
    setAuthMode('register');
    setShowAuthModal(true);
  };

  const handleLogout=()=> {
    // User is logged out at this point
    // Any state updates should happen in the parent component
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-microsoft-blue to-blue-600 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiActivity} className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Microsoft Service Health
                  </h1>
                  <p className="text-sm text-gray-600">
                    Real-time status for Azure, Entra ID, and Microsoft 365
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              
              {/* Service Status Indicators */}
              {(totalAlerts !==undefined || criticalAlerts !==undefined) && (
                <div className="flex gap-4">
                  <div className={`flex items-center gap-2 px-3 py-2 ${totalAlerts > 0 ? 'bg-blue-50' : 'bg-green-50'} rounded-lg`}>
                    <SafeIcon icon={FiShield} className={totalAlerts > 0 ? 'text-blue-600' : 'text-green-600'} />
                    <span className={`text-sm font-medium ${totalAlerts > 0 ? 'text-blue-800' : 'text-green-800'}`}>
                      {totalAlerts > 0 ? `${totalAlerts} Active Alert${totalAlerts !==1 ? 's' : ''}` : 'All Systems Operational'}
                    </span>
                  </div>
                  
                  {criticalAlerts > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                      <SafeIcon icon={FiAlertTriangle} className="text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        {criticalAlerts} Critical
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                
                {/* Last Updated */}
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Updated {formatDistanceToNow(lastUpdated)} ago
                  </span>
                )}

                {/* Refresh Button */}
                {onRefresh && (
                  <motion.button
                    whileHover={{scale: 1.05}}
                    whileTap={{scale: 0.95}}
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <SafeIcon icon={FiRefreshCw} className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium">
                      {loading ? 'Refreshing...' : 'Refresh'}
                    </span>
                  </motion.button>
                )}

                {/* Navigation & User Menu */}
                {user ? (
                  <div className="flex items-center gap-2">
                    
                    {/* Admin Link */}
                    {userRole && userRole.role !=='user' && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        <SafeIcon icon={FiSettings} className="text-sm" />
                        <span className="text-sm font-medium">Admin</span>
                      </Link>
                    )}

                    {/* User Menu */}
                    <UserMenu
                      user={user}
                      onOpenProfile={()=> setShowProfileModal(true)}
                      onOpenAlertSettings={()=> setShowAlertSubscriptionModal(true)}
                      onLogout={handleLogout}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{scale: 1.05}}
                      whileTap={{scale: 0.95}}
                      onClick={handleLogin}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <SafeIcon icon={FiLogIn} className="text-gray-500 text-sm" />
                      <span className="text-sm font-medium text-gray-700">Sign In</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{scale: 1.05}}
                      whileTap={{scale: 0.95}}
                      onClick={handleRegister}
                      className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                    >
                      <span className="text-sm font-medium">Register</span>
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modals - Rendered outside header to avoid z-index issues */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={()=> setShowAuthModal(false)}
        defaultMode={authMode}
      />

      {user && (
        <>
          <ProfileModal
            isOpen={showProfileModal}
            onClose={()=> setShowProfileModal(false)}
            user={user}
          />
          
          <AlertSubscriptionModal
            isOpen={showAlertSubscriptionModal}
            onClose={()=> setShowAlertSubscriptionModal(false)}
            user={user}
          />
        </>
      )}
    </>
  );
};

export default Header;