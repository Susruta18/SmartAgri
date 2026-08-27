import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Activity, Cloud, Bell, User,
  History, Leaf, Cpu, Settings, Camera
} from 'lucide-react';
import { cn } from '@/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Sensors', href: '/sensor-data', icon: Activity },
  { name: 'Crop Health', href: '/crop-health', icon: Leaf },
  { name: 'Data Collection', href: '/crop-health-collection', icon: Leaf },
  { name: 'Plant Disease AI', href: '/plant-disease', icon: Camera },
  { name: 'Weather', href: '/weather', icon: Cloud },
  { name: 'History', href: '/history', icon: History },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Device', href: '/device', icon: Cpu },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  onLinkClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLinkClick }) => {
  return (
    <div className="flex h-full w-64 flex-col bg-card border-r shadow-sm">
      <div className="flex h-16 items-center px-4 border-b">
        <Leaf className="h-8 w-8 text-primary" />
        <span className="ml-2 text-lg font-bold text-primary">AgriSmart</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              onClick={onLinkClick}
              className={({ isActive }) =>
                cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
