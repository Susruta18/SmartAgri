import React from 'react';
import { Bell, UserCircle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <Button variant="ghost" size="icon">
          <UserCircle className="h-6 w-6 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
};
