import { useState, useEffect, useMemo, useCallback } from 'react';
import UsersTable from './UsersTable';

const API_BASE_URL = window.location.origin;

export default function Dashboard({ user, onLogout }) {
  const currentUserId = user?.id ? String(user.id) : '';
  const currentUserLogin = user?.username || '';
  const currentIsAdmin = user?.is_admin || false;
  const currentUserFullName = user?.fullname || '';

  const [files, setFiles] = useState([]);
  const [usersList, setUsersList] = useState([]); // Список всех юзеров для админа
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [targetUserId, setTargetUserId] = useState(currentUserId);
  const [viewedUserLogin, setViewedUserLogin] = useState(currentUserLogin);

  const headers = useMemo(() => ({
    'X-User-Id': String(user?.id || ''),
    'X-User-IsAdmin': user?.is_admin ? 'true' : 'false',
    'Content-Type': 'application/json'
  }), [user]);

  const fetchFiles = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const url = `${API_BASE_URL}/api/files/?user_id=${targetUserId}`;
      const response = await fetch(url, {
          headers: headers,
          credentials: 'include'
      });
      if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Ошибка сети при загрузке файлов:", err);
    }
  }, [targetUserId, headers]);

  // Метод для получения списка всех пользователей (только для админа)
  const fetchUsers = useCallback(async () => {
    if (!currentIsAdmin) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/`, {
          headers: headers,
          credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUsersList(data.users || []);
      }
    } catch (err) { console.error("Ошибка при получении списка пользователей:", err); }
  }, [currentIsAdmin, headers]);

  useEffect(() => {
    if (currentUserId) {
      setTimeout(() => {
        fetchFiles();
        fetchUsers();
      }, 0);
    }
  }, [targetUserId, currentUserId, fetchFiles, fetchUsers]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert("Выберите файл");

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('comment', comment);
    formData.append('user_id', targetUserId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/files/upload/`, {
        method: 'POST',
        headers: {
          'X-User-Id': String(user?.id || ''),
          'X-User-IsAdmin': user?.is_admin ? 'true' : 'false'
        }, // Передаем только авторизацию, Content-Type для FormData браузер настроит сам!
        body: formData
      });

      if (response.ok) {
        setComment('');
        setSelectedFile(null);
        e.target.reset();
        fetchFiles();
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить этот файл?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${id}/`, {
          method: 'DELETE',
          headers: headers,
          credentials: 'include'
      });
      if (response.ok) {
          fetchFiles();
          fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const handleRename = async (id, oldName) => {
    const newName = window.prompt("Введите новое имя файла:", oldName);
    if (!newName || newName === oldName) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${id}/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_name: newName })
      });
      if (response.ok) fetchFiles();
    } catch (err) { console.error(err); }
  };

  // Удаление аккаунта пользователя (самого себя или админом)
  const handleDeleteUser = async (id, username) => {
    const isSelf = String(id) === String(currentUserId);
    const msg = isSelf
      ? "ВНИМАНИЕ! Вы собираетесь навсегда удалить СВОЙ аккаунт и ВСЕ свои файлы. Продолжить?"
      : `Вы действительно хотите удалить пользователя ${username} и все его файлы?`;

    if (!window.confirm(msg)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}/delete/`, {
        method: 'DELETE',
        headers: headers,
        credentials: 'include'
      });

      if (response.ok) {
        alert("Пользователь успешно удален.");
        if (isSelf) {
          onLogout(); // Если удалил себя — разлогиниваем на главную страницу
        } else {
          fetchUsers(); // Если удалил другого — обновляем таблицу админа
          if (String(targetUserId) === String(id)) {
            setTargetUserId(currentUserId); // Возвращаем админа в его хранилище
            setViewedUserLogin(currentUserLogin);
          }
        }
      } else {
        const d = await response.json();
        alert(`Ошибка: ${d.error}`);
      }
    } catch (err) { console.error(err); }
  };

  // Переключение прав администратора
  const handleToggleAdmin = async (id, currentStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${id}/toggle-admin/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_admin: !currentStatus })
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const d = await response.json();
        alert(`Ошибка: ${d.error}`);
      }
    } catch (err) { console.error(err); }
  };

  const handleCopyLink = (url) => {
    // Проверяем, доступен ли современный API буфера обмена
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => alert("Ссылка скопирована!"))
        .catch(() => alert("Не удалось скопировать ссылку"));
    } else {
      // Резервный надежный способ для работы на http:// без HTTPS
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed"; // Избегаем прокрутки страницы
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        alert("Ссылка скопирована (резервный режим)!");
      } catch (err) {
        alert("Не удалось скопировать ссылку");
      }
      document.body.removeChild(textarea);
    }
  };

  // Надежное скачивание/просмотр с передачей сессионных кук по сети
  const handleViewFile = (id, filename) => {
    const viewUrl = API_BASE_URL + '/api/files/' + id + '/download/?auth_user_id=' + currentUserId;

    // Открываем новую пустую вкладку
    const newWindow = window.open('', '_blank');

    if (newWindow) {
      // Записываем внутрь вкладки HTML-код с фреймом во весь экран
      newWindow.document.write(`
        <html>
          <head>
            <title>Просмотр: ${filename}</title>
            <style>
              body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #f4f4f9; font-family: sans-serif; }
              iframe { border: none; width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <iframe src="${viewUrl}"></iframe>
          </body>
        </html>
      `);
      newWindow.document.close();
    } else {
      alert("Браузер заблокировал всплывающее окно. Разрешите всплывающие окна для этого сайта.");
    }
  };

  if (!user) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>;
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f4f9', position: 'absolute', top: 0, left: 0 }}>

      {/* ВЕРХНЯЯ ШАПКА (HEADER) НА ВЕСЬ ЭКРАН */}
      <header style={{ width: '100%', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
            Облачное хранилище: <span style={{ color: '#007bff' }}>{viewedUserLogin}</span>
            {currentIsAdmin && <span style={{ color: '#dc3545', fontSize: '12px', marginLeft: '10px', padding: '2px 6px', backgroundColor: '#f8d7da', borderRadius: '4px' }}>Администратор</span>}
          </h2>
          <span style={{ fontSize: '14px', color: '#666' }}>Пользователь: <b>{currentUserFullName}</b> (ID: {currentUserId})</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Каждый пользователь видит кнопку удаления самого себя */}
          <button className="btn" style={{ width: 'auto', margin: 0, padding: '8px 15px', fontSize: '14px', backgroundColor: '#dc3545' }} onClick={() => handleDeleteUser(currentUserId, currentUserLogin)}>
            Удалить мой аккаунт
          </button>
          <button className="btn btn-secondary" style={{ width: 'auto', margin: 0, padding: '8px 20px', fontSize: '14px' }} onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      {/* ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ */}
      <main style={{ flex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '30px', boxSizing: 'border-box', textAlign: 'left' }}>

      {/* Блок Администратора: Управление всеми пользователями системы */}
        {currentIsAdmin && (
          <UsersTable
            usersList={usersList}
            targetUserId={targetUserId}
            currentUserId={currentUserId}
            onSelectUser={(id, username) => { setTargetUserId(id); setViewedUserLogin(username); }}
            onToggleAdmin={handleToggleAdmin}
            onDeleteUser={handleDeleteUser}
          />
        )}


        {/* Сетка элементов */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

          {/* Форма загрузки */}
          <form onSubmit={handleFileUpload} style={{ background: '#ffffff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e1e1e7' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>Загрузить новый файл</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <input type="file" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} required style={{ padding: '8px 0' }} />
              </div>
              <div style={{ flex: '2', minWidth: '250px' }}>
                <label style={{ fontSize: '13px', marginBottom: '4px', display: 'block', fontWeight: 'bold' }}>Комментарий:</label>
                <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Описание файла..." style={{ padding: '10px' }} />
              </div>
              <button type="submit" className="btn" style={{ width: 'auto', margin: 0, padding: '10px 25px' }}>Загрузить</button>
            </div>
          </form>

          {/* Таблица файлов */}
          <div style={{ background: '#ffffff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e1e1e7', overflowX: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>Файлы в хранилище ({files.length})</h3>

            {files.length === 0 ? (
              <p style={{ color: '#888', margin: 0 }}>В этом хранилище пока нет загруженных файлов.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #eaeaea' }}>
                    <th style={{ padding: '12px 10px', color: '#555', fontWeight: '600' }}>Имя файла</th>
                    <th style={{ padding: '12px 10px', color: '#555', fontWeight: '600' }}>Комментарий</th>
                    <th style={{ padding: '12px 10px', color: '#555', fontWeight: '600' }}>Размер</th>
                    <th style={{ padding: '12px 10px', color: '#555', fontWeight: '600' }}>Загружен</th>
                    <th style={{ padding: '12px 10px', color: '#555', fontWeight: '600' }}>Скачивался</th>
                    <th style={{ padding: '12px 10px', color: '#555', fontWeight: '600' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 10px', fontSize: '15px' }}><b>{file.filename}</b></td>
                      <td style={{ padding: '12px 10px', color: '#666', fontSize: '14px' }}>{file.comment || <span style={{color: '#bbb', fontStyle: 'italic'}}>нет</span>}</td>
                      <td style={{ padding: '12px 10px', fontSize: '14px' }}>{(file.size / 1024).toFixed(1)} КБ</td>
                      <td style={{ padding: '12px 10px', fontSize: '13px', color: '#777' }}>
                          {file.uploaded_at ? (
                            new Date(file.uploaded_at + 'Z').toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          ) : '—'}
                          </td>
                      <td style={{ padding: '12px 10px', fontSize: '13px', color: '#777' }}>
                            {file.last_downloaded_at && file.last_downloaded_at !== 'Не скачивался' ? (
                              new Date(file.last_downloaded_at + 'Z').toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            ) : 'Не скачивался'}
                          </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleViewFile(file.id, file.filename)} style={{ padding: '4px 10px', cursor: 'pointer' }}>Просмотр</button>
                          <button onClick={() => handleRename(file.id, file.filename)} style={{ padding: '4px 10px', cursor: 'pointer' }}>Имя</button>
                          <button onClick={() => handleCopyLink(file.share_url)} style={{ padding: '4px 10px', cursor: 'pointer', background: '#e2e3e5', border: '1px solid #ccc' }}>Ссылка</button>
                          <button onClick={() => handleDelete(file.id)} style={{ padding: '4px 10px', cursor: 'pointer', color: 'white', backgroundColor: '#dc3545', border: 'none', borderRadius: '4px' }}>Удалить</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}