import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import HomeNavbar from "./components/HomeNavbar";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import Loans from "./pages/Loans";
import Reports from "./pages/Reports";
import Predict from "./pages/Predict";
import Goals from "./pages/Goals";
import AiSuggestions from "./pages/AiSuggestions";

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthPage && <HomeNavbar isHomePage={isHomePage} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
        <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
        <Route path="/loans" element={<Layout><Loans /></Layout>} />
        <Route path="/reports" element={<Layout><Reports /></Layout>} />
        <Route path="/predict" element={<Layout><Predict /></Layout>} />
        <Route path="/goals" element={<Layout><Goals /></Layout>} />
        <Route path="/ai-suggestions" element={<Layout><AiSuggestions /></Layout>} />
      </Routes>
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
