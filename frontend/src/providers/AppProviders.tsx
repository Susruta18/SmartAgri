import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Inner component so NotificationProvider can access:
 * - useAuth() from AuthProvider (must be a child)
 * - useNavigate() from react-router-dom (must be inside RouterProvider)
 *
 * RouterProvider renders the router which includes all pages.
 * NotificationProvider is placed INSIDE the router so it has access
 * to useNavigate for notification tap navigation.
 */
const RouterWithNotifications: React.FC = () => (
  <RouterProvider router={router} />
);

export const AppProviders: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterWithNotifications />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
};
