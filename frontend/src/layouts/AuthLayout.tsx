import React from 'react';
import { Outlet } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-4 left-4 flex items-center">
        <Leaf className="h-6 w-6 text-primary" />
        <span className="ml-2 text-xl font-bold text-primary">AgriSmart</span>
      </div>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
};
