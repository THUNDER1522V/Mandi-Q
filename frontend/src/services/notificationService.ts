// MANDIQ Mock Notification Service

export interface MockNotification {
  id: string;
  phone: string;
  farmerName: string;
  token: string;
  crop: string;
  date: string;
  time: string;
  gate: string;
  status: 'Delivered ✓' | 'Failed';
  timestamp: Date;
}

class NotificationService {
  private notifications: MockNotification[] = [];
  private listeners: Set<() => void> = new Set();
  private latestNotification: MockNotification | null = null;

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getNotifications(): MockNotification[] {
    return [...this.notifications];
  }

  public getLatestNotification(): MockNotification | null {
    return this.latestNotification;
  }

  public clearLatestNotification(): void {
    this.latestNotification = null;
    this.notify();
  }

  public sendMockSMS(notification: Omit<MockNotification, 'id' | 'timestamp' | 'status'>): MockNotification {
    const newNotification: MockNotification = {
      ...notification,
      id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      status: 'Delivered ✓',
    };
    
    // Add to the front of the list
    this.notifications = [newNotification, ...this.notifications];
    this.latestNotification = newNotification;
    
    this.notify();
    return newNotification;
  }
}

export const notificationService = new NotificationService();
