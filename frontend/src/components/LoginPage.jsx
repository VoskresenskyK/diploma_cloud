import { useState } from 'react';

const API_BASE_URL = window.location.origin;

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    let localErrors = {};
    if (!login.trim()) localErrors.login = 'Введите логин';
    if (!password) localErrors.password = 'Введите пароль';

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: login, password: password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Ошибка сервера: ${response.status}`);
      }

      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(data.user);
      }

    } catch (error) {
      setServerError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Вход в систему</h2>
      {serverError && <div className="server-error">{serverError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label>Логин:</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <div className="error-message">{errors.login}</div>
        </div>

        <div className="form-group">
          <label>Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="error-message">{errors.password}</div>
        </div>

        <button type="submit" className="btn" disabled={isLoading}>
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate('main')}>
          Назад
        </button>
      </form>
    </div>
  );
}