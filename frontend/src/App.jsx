import { useState } from 'react';
import MainPage from './components/MainPage';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import './App.css';

export default function App() {
  // 1. При старте проверяем, есть ли уже сохраненный пользователь в localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('cloud_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 2. Если пользователь найден в localStorage, то сразу открываем dashboard, иначе 'main'
  const [currentPage, setCurrentPage] = useState(() => {
    const savedUser = localStorage.getItem('cloud_user');
    return savedUser ? 'dashboard' : 'main';
  });

  // Функция вызывается при успешном входе через LoginPage
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
    // 3. Записываем данные пользователя в память браузера (в виде строки JSON)
    localStorage.setItem('cloud_user', JSON.stringify(userData));
  };

  // Функция вызывается при нажатии на кнопку "Выйти"
  const handleLogout = () => {
    setUser(null);
    setCurrentPage('main');
    // 4. Полностью удаляем данные из памяти браузера при выходе
    localStorage.removeItem('cloud_user');
  };

  // Если мы на странице хранилища, рендерим Dashboard НА ВЕСЬ ЭКРАН, минуя класс .container
  if (currentPage === 'dashboard') {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="container">
      {currentPage === 'main' && (
        <MainPage onNavigate={setCurrentPage} />
      )}

      {currentPage === 'register' && (
        <RegisterPage
            onNavigate={setCurrentPage}
            onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentPage === 'login' && (
        <LoginPage onNavigate={setCurrentPage} onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}