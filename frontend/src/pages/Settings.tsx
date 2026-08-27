import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Server, Bell, Shield, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotificationPreferences, useUpdatePreferences } from '@/hooks/useNotifications';
import type { NotificationPreferences } from '@/hooks/useNotifications';

const Settings: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );

  // ── Notification preferences (backend-synced) ──────────────────────────────
  const { data: prefsData, isLoading: prefsLoading } = useNotificationPreferences();
  const updatePrefsMutation = useUpdatePreferences();

  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences>({
    soilMoistureAlerts: true,
    environmentAlerts:  true,
    rainAlerts:         true,
    cropHealthAlerts:   true,
    criticalAlerts:     true,
  });

  // Sync server prefs into local state when loaded
  useEffect(() => {
    if (prefsData?.preferences) {
      setLocalPrefs(prefsData.preferences);
    }
  }, [prefsData]);

  const handlePrefChange = async (key: keyof NotificationPreferences, value: boolean) => {
    // Critical alerts require confirmation before disabling
    if (key === 'criticalAlerts' && !value) {
      const confirmed = window.confirm(
        '⚠️ Disabling Critical Alerts means you will NOT receive high-priority notifications ' +
        'for serious crop diseases or environmental hazards.\n\nAre you sure you want to disable them?'
      );
      if (!confirmed) return;
    }

    // Optimistic local update
    const updated = { ...localPrefs, [key]: value };
    setLocalPrefs(updated);

    // Sync to backend
    try {
      await updatePrefsMutation.mutateAsync({ [key]: value });
    } catch {
      // Revert on failure
      setLocalPrefs(localPrefs);
    }
  };

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle('dark', checked);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <div className="space-y-6 pb-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences.</p>
      </div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
              </div>
              <Switch
                id="dark-mode-toggle"
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control which alerts you receive as push notifications. Changes sync to the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Soil Moisture */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Soil Moisture Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Warning when moisture drops below threshold
                    </p>
                  </div>
                  <Switch
                    id="pref-soil-moisture"
                    checked={localPrefs.soilMoistureAlerts}
                    onCheckedChange={(v) => handlePrefChange('soilMoistureAlerts', v)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>

                {/* Environment */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Environment Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Temperature, humidity, and light intensity warnings
                    </p>
                  </div>
                  <Switch
                    id="pref-environment"
                    checked={localPrefs.environmentAlerts}
                    onCheckedChange={(v) => handlePrefChange('environmentAlerts', v)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>

                {/* Rain */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Rain Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      When rain is detected or stops
                    </p>
                  </div>
                  <Switch
                    id="pref-rain"
                    checked={localPrefs.rainAlerts}
                    onCheckedChange={(v) => handlePrefChange('rainAlerts', v)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>

                {/* Crop Health */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Crop Health Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications when crop disease is detected
                    </p>
                  </div>
                  <Switch
                    id="pref-crop-health"
                    checked={localPrefs.cropHealthAlerts}
                    onCheckedChange={(v) => handlePrefChange('cropHealthAlerts', v)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>

                {/* Critical Alerts */}
                <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Critical Alerts</p>
                      <p className="text-xs text-muted-foreground">
                        High-severity disease and environmental hazards (requires confirmation to disable)
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="pref-critical"
                    checked={localPrefs.criticalAlerts}
                    onCheckedChange={(v) => handlePrefChange('criticalAlerts', v)}
                    disabled={updatePrefsMutation.isPending}
                  />
                </div>

                {updatePrefsMutation.isError && (
                  <p className="text-xs text-destructive">
                    Failed to save preferences. Please try again.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Backend Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              Backend Connection
            </CardTitle>
            <CardDescription>Cloud backend configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">API URL</span>
              <span className="font-mono text-xs">{import.meta.env.VITE_API_BASE_URL || '/api'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Architecture</span>
              <span className="text-xs">ESP32 → Backend → MongoDB → App</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• Authentication: JWT (stored securely)</p>
            <p>• Image storage: Cloudinary (server-side only)</p>
            <p>• No credentials exposed in the Android app</p>
            <p>• Push notifications: FCM via Firebase Admin SDK (backend only)</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>AgriSmart — AI-Based Smart Agriculture Monitoring</p>
            <p>Version 1.0.0</p>
            <p>Logged in as: <span className="text-foreground font-medium">{user?.email}</span></p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Button
          id="logout-btn"
          onClick={handleLogout}
          variant="destructive"
          className="w-full gap-2"
          size="lg"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </motion.div>
    </div>
  );
};

export default Settings;
