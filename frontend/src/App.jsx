import React, { useState } from 'react';
import MainPage from './components/MainPage';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('main');
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('main');
  };

  return (
    // Если мы на странице dashboard, увеличиваем ширину контейнера стилем max-width: 950px
    <div className="container" style={currentPage === 'dashboard' ? { maxWidth: '950px' } : {}}>
      {currentPage === 'main' && <MainPage onNavigate={setCurrentPage} />}
      {currentPage === 'register' && <RegisterPage onNavigate={setCurrentPage} />}
      {currentPage === 'login' && <LoginPage onNavigate={setCurrentPage} onLoginSuccess={handleLoginSuccess} />}
      {currentPage === 'dashboard' && <Dashboard user={user} onLogout={handleLogout} />}
    </div>
  );
}