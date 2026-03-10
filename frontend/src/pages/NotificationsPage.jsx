import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications.js';

export default function NotificationsPage() {
  const {
    notifications,
    unreadNotifications,
    unreadCount,
    markNotificationRead,
    markAllRead,
  } = useNotifications();
  const [activeTab, setActiveTab] = useState('unread');

  const visibleItems = activeTab === 'unread' ? unreadNotifications : notifications;

  return (
    <section className="stack">
      <article className="card">
        <div className="card-head">
          <h3>알림 센터</h3>
          <span className="pill-badge">{unreadCount}개 미읽음</span>
        </div>
        <p className="muted">중요한 건강 변화를 놓치지 않도록 정리했어요.</p>
        <div className="tab-chip-row">
          <button
            type="button"
            className={`tab-chip ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            미읽음
          </button>
          <button
            type="button"
            className={`tab-chip ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            전체
          </button>
          <button type="button" className="tab-chip" onClick={markAllRead}>
            모두 읽음
          </button>
        </div>
      </article>

      <article className="card">
        {visibleItems.length === 0 ? (
          <div className="empty-state">
            <strong>새 알림이 없습니다.</strong>
            <p>체크인을 입력하면 맞춤 알림이 다시 생성됩니다.</p>
          </div>
        ) : (
          <ul className="noti-feed">
            {visibleItems.map((item) => (
              <li key={item.key} className={`noti-feed-item ${item.level} ${item.isRead ? 'read' : ''}`}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
                {!item.isRead && (
                  <button type="button" className="noti-mark-btn" onClick={() => markNotificationRead(item.key)}>
                    읽음
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
