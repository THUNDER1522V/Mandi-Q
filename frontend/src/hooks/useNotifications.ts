import { useState, useEffect } from 'react';
import { notificationService, type MockNotification } from '../services/notificationService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<MockNotification[]>(notificationService.getNotifications());
  const [latestNotification, setLatestNotification] = useState<MockNotification | null>(notificationService.getLatestNotification());

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      setNotifications(notificationService.getNotifications());
      setLatestNotification(notificationService.getLatestNotification());
    });
    return () => unsubscribe();
  }, []);

  const clearLatest = () => {
    notificationService.clearLatestNotification();
  };

  return {
    notifications,
    latestNotification,
    clearLatest,
  };
}
