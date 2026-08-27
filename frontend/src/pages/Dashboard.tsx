import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import {
  Droplets, Thermometer, ThermometerSun,
  Wind, CloudRain, Sun, Leaf, AlertTriangle,
  Loader2, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import { SensorCard } from '@/components/SensorCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSocketSensor } from '@/hooks/useSocketSensor';
import { cn } from '@/utils';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const Dashboard: React.FC = () => {
  // ── Socket.IO real-time feed ─────────────────────────────────────────────
  const { sensorData: liveData, status: socketStatus, lastUpdated } = useSocketSensor();

  // ── Fallback: HTTP poll for initial data ─────────────────────────────────
  const { data: fetchedData, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const response = await api.get('/sensor/dashboard');
      return response.data;
    },
    refetchInterval: liveData ? false : 30000, // Stop polling once Socket.IO data arrives
    staleTime: 10000,
  });

  // Prefer live Socket.IO data; fall back to HTTP-fetched data
  const sensorPayload = liveData || (fetchedData?.hasData ? fetchedData : null);
  const noDataYet = !liveData && (!fetchedData || !fetchedData.hasData);

  if (isLoading && !liveData) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError && !liveData) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Failed to load sensor data</h2>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground">Live ESP32 sensor readings from your farm.</p>
        </div>
        {/* Connection Status Badge */}
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 px-3 py-1 text-sm font-medium',
            socketStatus === 'connected'
              ? 'border-green-500/40 text-green-600 bg-green-500/10'
              : socketStatus === 'connecting'
              ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
              : 'border-destructive/40 text-destructive bg-destructive/10'
          )}
        >
          {socketStatus === 'connected' ? (
            <><Wifi className="h-3.5 w-3.5" /> Live</>
          ) : socketStatus === 'connecting' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting</>
          ) : (
            <><WifiOff className="h-3.5 w-3.5" /> Disconnected</>
          )}
        </Badge>
      </div>

      {/* ── No data yet ── */}
      {noDataYet && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/10">
            <CardContent className="flex items-start gap-4 pt-6">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Waiting for ESP32 sensor data
                </p>
                <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-1">
                  No readings have been received yet. Make sure your ESP32 DevKit is powered on and
                  sending data to <code className="bg-muted px-1 rounded text-xs">POST /api/ingest/sensor</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Sensor Cards: 5 sensors matching physical hardware ── */}
      {sensorPayload && (
        <>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <SensorCard
              title="Soil Moisture"
              value={sensorPayload.soilMoisture}
              unit="%"
              icon={Droplets}
              status={
                sensorPayload.soilMoisture < 30 ? 'warning' :
                sensorPayload.soilMoisture > 80 ? 'warning' : 'normal'
              }
              lastUpdated={lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            />
            <SensorCard
              title="Soil Moisture (Raw)"
              value={sensorPayload.soilMoistureRaw || 0}
              unit="ADC"
              icon={Droplets}
              status="normal"
              lastUpdated={lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            />
            <SensorCard
              title="Soil Temperature"
              value={sensorPayload.soilTemperature}
              unit="°C"
              icon={Thermometer}
              status={sensorPayload.soilTemperature > 35 ? 'warning' : 'normal'}
              lastUpdated={lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            />
            <SensorCard
              title="Air Temperature"
              value={sensorPayload.airTemperature}
              unit="°C"
              icon={ThermometerSun}
              status={sensorPayload.airTemperature > 38 ? 'warning' : 'normal'}
              lastUpdated={lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            />
            <SensorCard
              title="Humidity"
              value={sensorPayload.humidity}
              unit="%"
              icon={Wind}
              status={
                sensorPayload.humidity < 30 ? 'warning' :
                sensorPayload.humidity > 90 ? 'warning' : 'normal'
              }
              lastUpdated={lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            />
            <SensorCard
              title="Light Intensity"
              value={sensorPayload.lightIntensity.toLocaleString()}
              unit="lux"
              icon={Sun}
              status="normal"
              lastUpdated={lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            />
            <SensorCard
              title="Rain Status"
              value={sensorPayload.rainDetected ? 'Raining' : 'Dry'}
              icon={CloudRain}
              status={sensorPayload.rainDetected ? 'warning' : 'normal'}
              lastUpdated={lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            />
            <SensorCard
              title="Rain Intensity"
              value={sensorPayload.rainIntensity?.toFixed(1) || 0}
              unit="%"
              icon={CloudRain}
              status={sensorPayload.rainIntensity > 50 ? 'warning' : 'normal'}
              lastUpdated={lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}
            />
          </motion.div>

          {/* ── Bottom summary cards ── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <motion.div
              className="col-span-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Environmental Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Sun className="h-12 w-12 text-amber-500" />
                      <div>
                        <div className="text-3xl font-bold">{sensorPayload.airTemperature}°C</div>
                        <div className="text-muted-foreground">
                          {sensorPayload.rainDetected ? '🌧 Rain Detected' : '☀ Clear'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        Humidity: <span className="font-medium">{sensorPayload.humidity}%</span>
                      </div>
                      <div className="text-sm">
                        Light: <span className="font-medium">{sensorPayload.lightIntensity.toLocaleString()} lux</span>
                      </div>
                      <div className="text-sm">
                        Soil: <span className="font-medium">{sensorPayload.soilMoisture}% ({sensorPayload.soilMoistureRaw || 0} ADC)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              className="col-span-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-primary">
                    <Leaf className="mr-2 h-5 w-5" />
                    Smart Suggestion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">
                    {sensorPayload.soilMoisture < 35
                      ? `Soil moisture is at ${sensorPayload.soilMoisture}%. Consider irrigation to maintain optimal crop health.`
                      : sensorPayload.airTemperature > 36
                      ? `Air temperature is high at ${sensorPayload.airTemperature}°C. Ensure adequate plant ventilation.`
                      : sensorPayload.rainDetected
                      ? 'Rain detected. Natural irrigation in progress — monitor soil moisture levels.'
                      : `All sensors are within normal range. Soil moisture: ${sensorPayload.soilMoisture}%. Continue regular monitoring.`
                    }
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
