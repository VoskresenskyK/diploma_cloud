import React, { useState } from 'react';

export default function RegisterPage({ onNavigate, onLoginSuccess }) {
  const [formData, setFormData] = useState({ login: '', fullname: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    let localErrors = {};

    const loginRegex = /^[a-zA-Z][a-zA-Z0-9]{3,19}$/;
    if (!loginRegex.test(formData.login.trim())) {
      localErrors.login = 'От 4 до 20 символов. Только латиница и цифры, первая — буква.';
    }

    if (formData.fullname.trim().length < 2) {
      localErrors.fullname = 'Введите ваше полное имя.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      localErrors.email = 'Некорректный формат email адреса.';
    }

    const pass = formData.password;
    const hasMinLength = pass.length >= 6;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasDigit = /[0-9]/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    if (!hasMinLength || !hasUpperCase || !hasDigit || !hasSpecialChar) {
      localErrors.password = 'Минимум 6 символов: 1 заглавная буква, 1 цифра и 1 спецсимвол.';
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.login.trim(),
          name: formData.fullname.trim(),
          email: formData.email.trim(),
          password: formData.password
        })
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
      <h2>Регистрация пользователя</h2>
      {serverError && <div className="server-error">{serverError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="login">Логин:</label>
          <input type="text" id="login" value={formData.login} onChange={handleChange} />
          <div className="error-message">{errors.login}</div>
        </div>

        <div className="form-group">
          <label htmlFor="fullname">Полное имя:</label>
          <input type="text" id="fullname" value={formData.fullname} onChange={handleChange} />
          <div className="error-message">{errors.fullname}</div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" value={formData.email} onChange={handleChange} />
          <div className="error-message">{errors.email}</div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input type="password" id="password" value={formData.password} onChange={handleChange} />
          <div className="error-message">{errors.password}</div>
        </div>

        <button type="submit" className="btn" disabled={isLoading}>
          {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate('main')}>
          Назад
        </button>
      </form>
    </div>
  );
}