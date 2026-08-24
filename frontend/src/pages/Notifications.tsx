import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, Droplets, ThermometerSun, AlertTriangle, CheckCircle2, 
  Leaf, Info, Trash2, CheckCheck
} from 'lucide-react';
import { cn } from '@/utils';

type NotificationCategory = 'alert' | 'system' | 'crop' | 'weather' | 'sensor';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  timestamp: string;
  isRead: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: '1',
    title: 'High Temperature Alert',
    message: 'Air temperature in Sector 2 has exceeded 35°C. Immediate action required.',
    category: 'alert',
    timestamp: '2 mins ago',
    isRead: false,
  },
  {
    id: '2',
    title: 'Irrigation Completed',
    message: 'Automated irrigation for Sector 1 was successfully completed.',
    category: 'system',
    timestamp: '1 hour ago',
    isRead: false,
  },
  {
    id: '3',
    title: 'Crop Health Issue Detected',
    message: 'Early Blight detected in Tomato crop (Sector 4). Confidence: 94.5%.',
    category: 'crop',
    timestamp: '3 hours ago',
    isRead: true,
  },
  {
    id: '4',
    title: 'Low Soil Moisture',
    message: 'Soil moisture in Sector 3 is critically low (22%). Schedule irrigation.',
    category: 'sensor',
    timestamp: 'Yesterday',
    isRead: true,
  },
  {
    id: '5',
    title: 'Weather Update',
    message: 'Heavy rain expected tomorrow. Avoid spraying pesticides today.',
    category: 'weather',
    timestamp: 'Yesterday',
    isRead: true,
  },
];

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'alert': return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'system': return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case 'crop': return <Leaf className="w-5 h-5 text-green-500" />;
      case 'weather': return <ThermometerSun className="w-5 h-5 text-amber-500" />;
      case 'sensor': return <Droplets className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getCategoryColor = (category: NotificationCategory) => {
    switch (category) {
      case 'alert': return 'bg-destructive/10 border-destructive/20';
      case 'system': return 'bg-primary/10 border-primary/20';
      case 'crop': return 'bg-green-500/10 border-green-500/20';
      case 'weather': return 'bg-amber-500/10 border-amber-500/20';
      case 'sensor': return 'bg-blue-500/10 border-blue-500/20';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-3 px-2 py-0.5 text-xs rounded-full">
                {unreadCount} New
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Manage your alerts and system updates.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'unread' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
          <CardTitle className="text-lg">Recent Notifications</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="text-muted-foreground hover:text-primary"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium">No notifications</h3>
              <p className="text-sm text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "flex flex-col sm:flex-row gap-4 p-4 sm:p-6 transition-colors hover:bg-muted/50",
                    !notification.isRead ? "bg-primary/5" : ""
                  )}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={cn("p-2 rounded-full border", getCategoryColor(notification.category))}>
                      {getCategoryIcon(notification.category)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className={cn("font-medium", !notification.isRead && "font-bold text-foreground")}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {notification.timestamp}
                        </span>
                      </div>
                      <p className={cn("text-sm", !notification.isRead ? "text-foreground/90" : "text-muted-foreground")}>
                        {notification.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end sm:flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!notification.isRead && (
                      <Button variant="ghost" size="icon" onClick={() => handleMarkAsRead(notification.id)} title="Mark as read">
                        <CheckCheck className="w-4 h-4 text-primary" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(notification.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;