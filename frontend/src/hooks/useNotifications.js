import { useCallback, useEffect, useMemo, useState } from 'react';
import { notificationApi } from '../api/notificationApi.js';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await notificationApi.list(100);
      const items = (data.items || []).map((item) => ({
        ...item,
        key: String(item.id),
        isRead: Boolean(item.is_read),
      }));
      setNotifications(items);
      setUnreadCount(Number(data.unread_count || 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.isRead),
    [notifications],
  );

  const markNotificationRead = async (key) => {
    await notificationApi.markRead(Number(key));
    await refresh();
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    await refresh();
  };

  return {
    notifications,
    unreadNotifications,
    unreadCount,
    markNotificationRead,
    markAllRead,
    refresh,
  };
}
