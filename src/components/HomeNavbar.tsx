import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet } from 'lucide-react';

interface NavbarProps {
  isHomePage?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isHomePage = false }) => {
  const location = useLocation();
  
  if (isHomePage) {
    // Home page navbar: Logo left, Login/Signup right
    return (
      <nav className="bg-gradient-to-r from-slate-100 via-blue-100 to-indigo-200 shadow-2xl border-b border-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 hover:scale-105 transition-transform no-underline">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent no-underline">
                  Smart Finance Tracker
                </span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
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
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Dashboard navbar: Logo + navigation items
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/budgets', label: 'Budgets' },
    { path: '/goals', label: 'Goals' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="bg-gradient-to-r from-slate-100 via-blue-100 to-indigo-200 shadow-2xl border-b border-white/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 hover:scale-105 transition-transform no-underline">
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
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;