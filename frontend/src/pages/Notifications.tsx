import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, Droplets, ThermometerSun, AlertTriangle, CheckCircle2, 
  Leaf, Info, Trash2, CheckCheck, Loader2, RefreshCw
} from 'lucide-react';
import { cn } from '@/utils';
import {
  useNotificationList,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  type AppNotification,
} from '@/hooks/useNotifications';

// ── Category helpers ──────────────────────────────────────────────────────────

type UICategory = 'alert' | 'system' | 'crop' | 'weather' | 'sensor';

function resolveCategory(n: AppNotification): UICategory {
  if (n.sensorType === 'CROP_HEALTH') return 'crop';
  if (n.sensorType === 'ENVIRONMENT') return 'weather';
  if (n.sensorType === 'SOIL_MOISTURE' || n.sensorType === 'RAIN') return 'sensor';
  if (n.sensorType === 'RECOVERY') return 'system';
  if (n.type === 'alert') return 'alert';
  if (n.type === 'success') return 'system';
  if (n.type === 'warning') return 'sensor';
  return 'system';
}

const getCategoryIcon = (category: UICategory) => {
  switch (category) {
    case 'alert':   return <AlertTriangle className="w-5 h-5 text-destructive" />;
    case 'system':  return <CheckCircle2 className="w-5 h-5 text-primary" />;
    case 'crop':    return <Leaf className="w-5 h-5 text-green-500" />;
    case 'weather': return <ThermometerSun className="w-5 h-5 text-amber-500" />;
    case 'sensor':  return <Droplets className="w-5 h-5 text-blue-500" />;
    default:        return <Info className="w-5 h-5 text-muted-foreground" />;
  }
};

const getCategoryColor = (category: UICategory) => {
  switch (category) {
    case 'alert':   return 'bg-destructive/10 border-destructive/20';
    case 'system':  return 'bg-primary/10 border-primary/20';
    case 'crop':    return 'bg-green-500/10 border-green-500/20';
    case 'weather': return 'bg-amber-500/10 border-amber-500/20';
    case 'sensor':  return 'bg-blue-500/10 border-blue-500/20';
    default:        return 'bg-muted border-border';
  }
};

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1)   return 'Just now';
  if (diffMins < 60)  return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const Notifications: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading, isError, refetch, isFetching } = useNotificationList();
  const markAsReadMutation   = useMarkAsRead();
  const markAllReadMutation  = useMarkAllAsRead();
  const deleteMutation       = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unreadCount ?? 0;

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
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
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            className="text-muted-foreground hover:text-primary"
          >
            {markAllReadMutation.isPending
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <CheckCheck className="w-4 h-4 mr-2" />
            }
            Mark all as read
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive mb-3 opacity-60" />
              <p className="text-sm text-muted-foreground">Failed to load notifications.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium">No notifications</h3>
              <p className="text-sm text-muted-foreground">You're all caught up!</p>
            </div>
          )}

          {/* Notification list */}
          {!isLoading && !isError && filteredNotifications.length > 0 && (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => {
                const category = resolveCategory(notification);
                return (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "flex flex-col sm:flex-row gap-4 p-4 sm:p-6 transition-colors hover:bg-muted/50",
                      !notification.isRead ? "bg-primary/5" : ""
                    )}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={cn("p-2 rounded-full border", getCategoryColor(category))}>
                        {getCategoryIcon(category)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className={cn("font-medium", !notification.isRead && "font-bold text-foreground")}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        <p className={cn("text-sm whitespace-pre-line", !notification.isRead ? "text-foreground/90" : "text-muted-foreground")}>
                          {notification.message}
                        </p>
                        {notification.severity === 'CRITICAL' && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">CRITICAL</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end sm:flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                          title="Mark as read"
                        >
                          <CheckCheck className="w-4 h-4 text-primary" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleteMutation.isPending}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;