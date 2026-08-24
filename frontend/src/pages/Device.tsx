import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Cpu, MapPin, Clock, Wifi, WifiOff, Loader2, Signal, Network, Save } from 'lucide-react';
import { useSocketSensor } from '@/hooks/useSocketSensor';
import { cn } from '@/utils';
import api from '@/api/axios';

const Device: React.FC = () => {
  const { sensorData, status: socketStatus, lastUpdated } = useSocketSensor();

  const deviceId = sensorData?.deviceId || 'ESP32-001';
  const isOnline = socketStatus === 'connected' && !!sensorData;

  const [ipAddress, setIpAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const res = await api.get(`/device/${deviceId}`);
        if (res.data.ipAddress) {
          setIpAddress(res.data.ipAddress);
        }
      } catch (error) {
        console.error('Failed to fetch device details:', error);
      }
    };
    fetchDevice();
  }, [deviceId]);

  const handleSaveIp = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/device/${deviceId}/ip`, { ipAddress });
    } catch (error) {
      console.error('Failed to update IP address:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Device</h1>
        <p className="text-muted-foreground">Your ESP32 DevKit IoT sensor controller status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Device Identity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <Card className="border-primary/10">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Cpu className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>ESP32 DevKit V1</CardTitle>
                    <CardDescription>IoT Sensor Controller</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1.5',
                    isOnline
                      ? 'border-green-500/40 text-green-600 bg-green-500/10'
                      : 'border-destructive/40 text-destructive bg-destructive/10'
                  )}
                >
                  {socketStatus === 'connecting' ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Connecting</>
                  ) : isOnline ? (
                    <><Wifi className="h-3 w-3" /> Online</>
                  ) : (
                    <><WifiOff className="h-3 w-3" /> Offline</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Device ID</p>
                  <p className="font-mono font-medium">{deviceId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Model</p>
                  <p className="font-medium">ESP32 FM DevKit</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Last Seen</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {lastUpdated
                      ? lastUpdated.toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Connection</p>
                  <p className="font-medium flex items-center gap-1">
                    <Signal className="h-3.5 w-3.5 text-muted-foreground" />
                    ESP32 → Internet → Backend
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Field deployment location can be configured in device settings.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Network Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                Network Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center max-w-xl">
                <div className="flex-1 w-full">
                  <Input 
                    placeholder="e.g. 192.168.1.50" 
                    value={ipAddress} 
                    onChange={(e) => setIpAddress(e.target.value)} 
                    className="w-full"
                  />
                </div>
                <Button onClick={handleSaveIp} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save IP
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Store the local IP address of your ESP32 here. Future features may use this to send direct commands to the device.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sensors Connected */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          <Card>
            <CardHeader>
              <CardTitle>Connected Sensors</CardTitle>
              <CardDescription>5 sensors wired to the ESP32 DevKit V1</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { name: 'Soil Moisture Sensor', model: 'Capacitive v2.0', pin: 'ADC GPIO34' },
                  { name: 'Soil Temperature', model: 'DS18B20 Waterproof', pin: 'OneWire GPIO4' },
                  { name: 'Air Temp & Humidity', model: 'DHT22 AM2302', pin: 'GPIO5' },
                  { name: 'Light Intensity', model: 'BH1750 GY-302', pin: 'I2C SDA/SCL' },
                  { name: 'Rain Sensor', model: 'YL-83', pin: 'Digital GPIO35' },
                ].map((sensor) => (
                  <div
                    key={sensor.name}
                    className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-sm font-medium text-foreground">{sensor.name}</p>
                    <p className="text-xs text-muted-foreground">{sensor.model}</p>
                    <p className="text-xs font-mono text-primary/70">{sensor.pin}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Device;
