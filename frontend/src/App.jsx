import React, { useState } from 'react';
import MainPage from './components/MainPage';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('main');
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentPage('dashboard'); // Перенаправляем внутрь сервиса после входа
  };

  return (
    <div className="container">
      {currentPage === 'main' && (
        <MainPage onNavigate={setCurrentPage} />
      )}

      {currentPage === 'register' && (
        <RegisterPage onNavigate={setCurrentPage} />
      )}

      {currentPage === 'login' && (
        <LoginPage onNavigate={setCurrentPage} onLoginSuccess={handleLoginSuccess} />
      )}

      {currentPage === 'dashboard' && (
        <div>
          <h2>Личный кабинет облака</h2>
          <p>Приветствуем вас в вашей рабочей панели!</p>
          <button className="btn btn-secondary" onClick={() => { setUser(null); setCurrentPage('main'); }}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}