import React from 'react';

export default function UsersTable({
  usersList,
  targetUserId,
  currentUserId,
  onSelectUser,
  onToggleAdmin,
  onDeleteUser
}) {
  return (
    <div style={{ background: '#ffffff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e1e1e7', marginBottom: '25px', overflowX: 'auto' }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#495057' }}>
        Все пользователи системы ({usersList.length})
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #eaeaea' }}>
            <th style={{ padding: '10px' }}>ID</th>
            <th style={{ padding: '10px' }}>Логин</th>
            <th style={{ padding: '10px' }}>Полное имя</th>
            <th style={{ padding: '10px' }}>Email</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Файлов</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Объем хранилища</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Администратор</th>
            <th style={{ padding: '10px' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {usersList.map((u) => (
            <tr
              key={u.id}
              style={{
                borderBottom: '1px solid #eee',
                backgroundColor: String(targetUserId) === String(u.id) ? '#f0f7ff' : 'transparent',
                transition: 'background-color 0.2s'
              }}
            >
              <td style={{ padding: '10px' }}>{u.id}</td>
              <td style={{ padding: '10px' }}><b>{u.username}</b></td>
              <td style={{ padding: '10px' }}>{u.fullname}</td>
              <td style={{ padding: '10px', color: '#666' }}>{u.email}</td>

              {/* Новая колонка: Количество файлов */}
              <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>
                {u.files_count}
              </td>

              {/* Новая колонка: Размер хранилища */}
              <td style={{ padding: '10px', textAlign: 'center', color: '#444' }}>
                {u.total_size_kb} КБ
              </td>

              <td style={{ padding: '10px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={u.is_admin}
                  disabled={String(u.id) === String(currentUserId)}
                  onChange={() => onToggleAdmin(u.id, u.is_admin)}
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                />
              </td>
              <td style={{ padding: '10px' }}>
                {/* Ссылка для быстрого перехода в интерфейс управления файлами пользователя */}
                <button
                  onClick={() => onSelectUser(String(u.id), u.username)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#007bff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    marginRight: '15px',
                    fontSize: '14px',
                    fontWeight: String(targetUserId) === String(u.id) ? 'bold' : 'normal'
                  }}
                >
                  {String(targetUserId) === String(u.id) ? 'Управление файлами' : 'Перейти к файлам'}
                </button>

                <button
                  onClick={() => onDeleteUser(u.id, u.username)}
                  disabled={String(u.id) === String(currentUserId)}
                  style={{ padding: '4px 8px', color: 'white', backgroundColor: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}