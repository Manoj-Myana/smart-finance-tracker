import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, BarChart3, Target, Settings, Wallet, CreditCard } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/transactions', icon: PlusCircle, label: 'Transactions' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/loans', icon: CreditCard, label: 'Loans' },
    { path: '/budgets', icon: Wallet, label: 'Budgets' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Wallet className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">SmartFinance</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
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