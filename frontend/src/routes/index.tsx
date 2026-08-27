import { createHashRouter } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import SensorData from '@/pages/SensorData';
import CropHealth from '@/pages/CropHealth';
import CropHealthDataCollection from '@/pages/CropHealthDataCollection';
import Weather from '@/pages/Weather';
import History from '@/pages/History';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';
import Device from '@/pages/Device';
import Settings from '@/pages/Settings';
import PlantDiseaseDetection from '@/pages/PlantDiseaseDetection';

import { ProtectedRoute } from '@/routes/ProtectedRoute';

import ForgotPassword from '@/pages/ForgotPassword';
import Register from '@/pages/Register';

export const router = createHashRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'sensor-data', element: <SensorData /> },
          { path: 'crop-health', element: <CropHealth /> },
          { path: 'crop-health-collection', element: <CropHealthDataCollection /> },
          { path: 'plant-disease', element: <PlantDiseaseDetection /> },
          { path: 'weather', element: <Weather /> },
          { path: 'history', element: <History /> },
          { path: 'notifications', element: <Notifications /> },
          { path: 'profile', element: <Profile /> },
          { path: 'device', element: <Device /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
    ],
  },
]);
