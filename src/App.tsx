import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Navbar from './components/Navbar';
import HomeNavbar from './components/HomeNavbar';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isDashboardOrRelatedPage = location.pathname.startsWith('/dashboard') || 
                                   location.pathname.startsWith('/transactions') || 
                                   location.pathname.startsWith('/reports') || 
                                   location.pathname.startsWith('/analytics') || 
                                   location.pathname.startsWith('/budgets') || 
                                   location.pathname.startsWith('/goals') || 
                                   location.pathname.startsWith('/settings');

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthPage && (
        (isHomePage || isDashboardOrRelatedPage) ? <HomeNavbar isHomePage={isHomePage} /> : <Navbar />
      )}
      
      {(isHomePage || isAuthPage) ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="/analytics" element={<Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-600">Analytics Page - Coming Soon</h2></div></Layout>} />
          <Route path="/budgets" element={<Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-600">Budgets Page - Coming Soon</h2></div></Layout>} />
          <Route path="/goals" element={<Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-600">Goals Page - Coming Soon</h2></div></Layout>} />
          <Route path="/settings" element={<Layout><div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-600">Settings Page - Coming Soon</h2></div></Layout>} />
        </Routes>
      ) : (
        <Layout>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-600">Analytics Page - Coming Soon</h2></div>} />
            <Route path="/budgets" element={<div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-600">Budgets Page - Coming Soon</h2></div>} />
            <Route path="/goals" element={<div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-600">Goals Page - Coming Soon</h2></div>} />
            <Route path="/settings" element={<div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-600">Settings Page - Coming Soon</h2></div>} />
          </Routes>
        </Layout>
      )}
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;
