import React from 'react';

export default function MainPage({ onNavigate }) {
  return (
    <div>
      <h1>Добро пожаловать в Cloud Space!</h1>
      <p><strong>Cloud Space</strong> — это надежное облачное хранилище для ваших файлов. Загружайте документы, делитесь фотографиями и работайте совместно с командой из любой точки мира.</p>
      <p>Для начала работы войдите в свой аккаунт или создайте новый.</p>

      <button className="btn" onClick={() => onNavigate('login')}>
        Войти в аккаунт
      </button>
      <button className="btn btn-secondary" onClick={() => onNavigate('register')}>
        Регистрация
      </button>
    </div>
  );
}