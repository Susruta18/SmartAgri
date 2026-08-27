import React from 'react';
import { Bell, UserCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '@/context/NotificationContext';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotificationContext();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {/* Notification Bell with real unread badge */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          id="header-notifications-btn"
          onClick={() => navigate('/notifications')}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} aria-label="Profile">
          <UserCircle className="h-6 w-6 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
};
