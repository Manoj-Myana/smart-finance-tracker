import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wallet, LogOut, CreditCard, MoreVertical, MessageCircle, Bell, Download, Flame } from 'lucide-react';

interface NavbarProps {
  isHomePage?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isHomePage = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      // Close dropdown on scroll
      setIsDropdownOpen(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setIsLoggedIn(true);
      try {
        const parsedUser = JSON.parse(userData);
        setUserName(parsedUser.fullName || 'User');
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUserName('User');
      }
    } else {
      setIsLoggedIn(false);
      setUserName('');
    }
  }, [location]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 200); // 200ms delay before closing
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Call logout API
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      setIsLoggedIn(false);
      setUserName('');
      navigate('/');
    }
  };
  
  if (isHomePage) {
    // Home page navbar: Logo left, Login/Signup right
    return (
      <nav 
        className="bg-gradient-to-r from-slate-100 via-blue-100 to-indigo-200 shadow-2xl border-b border-white/30 backdrop-blur-sm"
        style={{ position: 'relative', zIndex: 1000 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center space-x-3 hover:scale-105 transition-transform no-underline">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent no-underline">
                  Smart Finance Tracker
                </span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-700 font-medium">Welcome, {userName}!</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 transform"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 transform no-underline"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 transform no-underline"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Dashboard navbar: Logo + navigation items (Dashboard link removed when logged in)
  const navItems = [
    { path: '/transactions', label: 'Transactions' },
    { path: '/reports', label: 'PDF/Excel' },
    { path: '/predict', label: 'Predict Future Values' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/loans', label: 'Loans' },
    { path: '/goals', label: 'Goals' },
    { path: '/ai-suggestions', label: 'AI Suggestions' },
  ];

  return (
    <>
      {/* CSS Animation Styles */}
      <style>
        {`
          @keyframes dropdownFadeIn {
            0% {
              opacity: 0;
              transform: translateY(-10px) scale(0.95);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
      
      <nav 
        className="bg-gradient-to-r from-slate-100 via-blue-100 to-indigo-200 shadow-2xl border-b border-white/30 backdrop-blur-sm"
        style={{ position: 'relative', zIndex: 1000 }}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center space-x-3 hover:scale-105 transition-transform no-underline">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent no-underline">
                Smart Finance Tracker
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 no-underline ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-white/60 backdrop-blur-sm'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            
            {/* Three-dot menu with dropdown */}
            {isLoggedIn && (
              <>
                {/* Backdrop overlay when dropdown is open */}
                {isDropdownOpen && (
                  <div 
                    className="fixed inset-0"
                    style={{ 
                      zIndex: 9998,
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)',
                      backdropFilter: 'blur(2px)'
                    }}
                    onClick={() => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                      }
                      setIsDropdownOpen(false);
                    }}
                  />
                )}
                
                <div 
                  className="relative"
                  ref={dropdownRef}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:scale-105 transform"
                    style={{ 
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                      color: '#4f46e5',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)';
                      e.currentTarget.style.color = '#3730a3';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)';
                      e.currentTarget.style.color = '#4f46e5';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                    }}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  
                  {/* Invisible bridge to prevent dropdown from closing */}
                  {isDropdownOpen && (
                    <div 
                      className="absolute right-0 top-10 w-48 h-4"
                      style={{ 
                        zIndex: 9998,
                        background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.02) 0%, transparent 100%)'
                      }}
                    />
                  )}
                  
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div 
                      className="absolute right-0 top-12 w-48 rounded-xl shadow-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 50%, rgba(239,246,255,0.95) 100%)',
                        boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        zIndex: 9999,
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        backdropFilter: 'blur(16px)',
                        animation: 'dropdownFadeIn 0.2s ease-out forwards',
                        transformOrigin: 'top right'
                      }}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                        <Link
                          to="/chatbot"
                          className="flex items-center px-4 py-3 mx-2 mb-2 transition-all no-underline rounded-xl"
                          style={{
                            color: '#374151',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)';
                            e.currentTarget.style.color = '#1e40af';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#374151';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                          onClick={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                            }
                            setIsDropdownOpen(false);
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-3" style={{ color: '#3b82f6' }} />
                          <span className="font-medium">Chatbot</span>
                        </Link>
                        <Link
                          to="/notifications"
                          className="flex items-center px-4 py-3 mx-2 mb-2 transition-all no-underline rounded-xl"
                          style={{
                            color: '#374151'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)';
                            e.currentTarget.style.color = '#1e40af';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#374151';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                          onClick={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                            }
                            setIsDropdownOpen(false);
                          }}
                        >
                          <Bell className="h-4 w-4 mr-3" style={{ color: '#8b5cf6' }} />
                          <span className="font-medium">Notifications</span>
                        </Link>
                        <Link
                          to="/streak"
                          className="flex items-center px-4 py-3 mx-2 mb-2 transition-all no-underline rounded-xl"
                          style={{
                            color: '#374151'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)';
                            e.currentTarget.style.color = '#1e40af';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#374151';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                          onClick={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                            }
                            setIsDropdownOpen(false);
                          }}
                        >
                          <Flame className="h-4 w-4 mr-3" style={{ color: '#f97316' }} />
                          <span className="font-medium">Streak</span>
                        </Link>
                        <Link
                          to="/download-report"
                          className="flex items-center px-4 py-3 mx-2 transition-all no-underline rounded-xl"
                          style={{
                            color: '#374151',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)';
                            e.currentTarget.style.color = '#1e40af';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#374151';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                          onClick={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                            }
                            setIsDropdownOpen(false);
                          }}
                        >
                          <Download className="h-4 w-4 mr-3" style={{ color: '#10b981' }} />
                          <span className="font-medium">Download Report</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Logout button for authenticated users */}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 transform font-semibold text-sm ml-2"
                style={{ cursor: 'pointer' }}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
};

export default Navbar;