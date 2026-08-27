import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSocketSensor } from '@/hooks/useSocketSensor';
import {
  Droplets, Thermometer, ThermometerSun, Wind,
  CloudRain, Sun, Cpu, Wifi, WifiOff, Loader2
} from 'lucide-react';
import { cn } from '@/utils';

interface SensorDetailCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  unit?: string;
  description: string;
  status: 'normal' | 'warning';
  color: string;
}

const SensorDetailCard: React.FC<SensorDetailCardProps> = ({
  icon: Icon, title, value, unit, description, status, color,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    transition={{ duration: 0.3 }}
  >
    <Card className={cn(
      'border transition-all duration-300',
      status === 'warning' ? 'border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10' : 'border-border/50'
    )}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {status === 'warning' && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-xs">
              Check
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {unit && <span className="text-base text-muted-foreground">{unit}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
);

const SensorData: React.FC = () => {
  const { sensorData, status: socketStatus, lastUpdated } = useSocketSensor();

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sensor Readings</h1>
          <p className="text-muted-foreground">
            Live data from your ESP32 DevKit V1 with 5 connected sensors.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5 px-3 py-1',
            socketStatus === 'connected'
              ? 'border-green-500/40 text-green-600 bg-green-500/10'
              : 'border-destructive/40 text-destructive bg-destructive/10'
          )}
        >
          {socketStatus === 'connected' ? (
            <><Wifi className="h-3.5 w-3.5" /> Live</>
          ) : socketStatus === 'connecting' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting</>
          ) : (
            <><WifiOff className="h-3.5 w-3.5" /> Offline</>
          )}
        </Badge>
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {!sensorData ? (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Cpu className="h-12 w-12 text-muted-foreground/50" />
            <div className="text-center">
              <p className="font-medium text-foreground">No sensor data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Waiting for your ESP32 DevKit to send readings via{' '}
                <code className="bg-muted px-1 rounded text-xs">POST /api/ingest/sensor</code>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SensorDetailCard
            icon={Droplets}
            title="Soil Moisture"
            value={sensorData.soilMoisture}
            unit="%"
            description="Capacitive Soil Moisture Sensor v2.0 — measures volumetric water content of soil."
            status={sensorData.soilMoisture < 30 || sensorData.soilMoisture > 80 ? 'warning' : 'normal'}
            color="bg-blue-500"
          />
          <SensorDetailCard
            icon={Droplets}
            title="Soil Moisture (Raw)"
            value={sensorData.soilMoistureRaw || 0}
            unit="ADC"
            description="Raw analog reading (4095 = Dry, 0 = Wet)."
            status="normal"
            color="bg-blue-600"
          />
          <SensorDetailCard
            icon={Thermometer}
            title="Soil Temperature"
            value={sensorData.soilTemperature}
            unit="°C"
            description="DS18B20 Waterproof Temperature Probe — accurate soil temperature measurement."
            status={sensorData.soilTemperature > 35 ? 'warning' : 'normal'}
            color="bg-orange-500"
          />
          <SensorDetailCard
            icon={ThermometerSun}
            title="Air Temperature"
            value={sensorData.airTemperature}
            unit="°C"
            description="DHT22 AM2302 — measures ambient air temperature above crop canopy."
            status={sensorData.airTemperature > 38 ? 'warning' : 'normal'}
            color="bg-red-500"
          />
          <SensorDetailCard
            icon={Wind}
            title="Humidity"
            value={sensorData.humidity}
            unit="%"
            description="DHT22 AM2302 — relative humidity sensor for disease risk assessment."
            status={sensorData.humidity < 30 || sensorData.humidity > 90 ? 'warning' : 'normal'}
            color="bg-cyan-500"
          />
          <SensorDetailCard
            icon={Sun}
            title="Light Intensity"
            value={sensorData.lightIntensity.toLocaleString()}
            unit="lux"
            description="BH1750 GY-302 — digital ambient light sensor for photosynthesis monitoring."
            status="normal"
            color="bg-yellow-500"
          />
          <SensorDetailCard
            icon={CloudRain}
            title="Rain Status"
            value={sensorData.rainDetected ? 'Raining' : 'Dry'}
            description="YL-83 Rain Sensor — detects presence of rainfall for irrigation decisions."
            status={sensorData.rainDetected ? 'warning' : 'normal'}
            color={sensorData.rainDetected ? 'bg-indigo-500' : 'bg-slate-500'}
          />
          <SensorDetailCard
            icon={CloudRain}
            title="Rain Intensity"
            value={sensorData.rainIntensity?.toFixed(1) || 0}
            unit="%"
            description="YL-83 Rain Sensor — measures the amount of rainfall."
            status={sensorData.rainIntensity > 50 ? 'warning' : 'normal'}
            color="bg-indigo-600"
          />
        </div>
      )}
    </div>
  );
};

export default SensorData;