import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CloudSun, Wind, Droplets, Sun, CloudRain, AlertCircle, Thermometer 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const hourlyForecast = [
  { time: '08:00', temp: 21, rainProb: 10 },
  { time: '10:00', temp: 24, rainProb: 5 },
  { time: '12:00', temp: 28, rainProb: 0 },
  { time: '14:00', temp: 30, rainProb: 0 },
  { time: '16:00', temp: 29, rainProb: 15 },
  { time: '18:00', temp: 26, rainProb: 30 },
  { time: '20:00', temp: 23, rainProb: 40 },
];

const dailyForecast = [
  { day: 'Mon', high: 30, low: 20, icon: Sun },
  { day: 'Tue', high: 28, low: 22, icon: CloudSun },
  { day: 'Wed', high: 25, low: 19, icon: CloudRain },
  { day: 'Thu', high: 26, low: 18, icon: CloudSun },
  { day: 'Fri', high: 29, low: 21, icon: Sun },
];

const Weather: React.FC = () => {
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Weather</h1>
        <p className="text-muted-foreground">Local farm weather and accurate forecasting.</p>
      </div>

      {/* Weather Advisory */}
      <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-500/20 shadow-sm">
        <CardContent className="flex items-start p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mr-3 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-500">Weather Advisory</h3>
            <p className="text-sm text-amber-700/90 dark:text-amber-400/90 mt-1">
              High temperatures expected this afternoon (up to 30°C). Ensure adequate hydration for crops in Sector 2.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Current Weather */}
        <Card className="md:col-span-5 lg:col-span-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground font-medium">Currently</p>
                <div className="text-6xl font-bold text-foreground mt-2 tracking-tighter">28°</div>
                <p className="text-lg font-medium text-foreground/80 mt-1">Partly Cloudy</p>
              </div>
              <CloudSun className="w-20 h-20 text-primary opacity-80" />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center">
                <Thermometer className="w-5 h-5 text-muted-foreground mr-2" />
                <div>
                  <p className="text-xs text-muted-foreground">Feels like</p>
                  <p className="font-medium">30°C</p>
                </div>
              </div>
              <div className="flex items-center">
                <Wind className="w-5 h-5 text-muted-foreground mr-2" />
                <div>
                  <p className="text-xs text-muted-foreground">Wind</p>
                  <p className="font-medium">12 km/h</p>
                </div>
              </div>
              <div className="flex items-center">
                <Droplets className="w-5 h-5 text-muted-foreground mr-2" />
                <div>
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="font-medium">60%</p>
                </div>
              </div>
              <div className="flex items-center">
                <CloudRain className="w-5 h-5 text-muted-foreground mr-2" />
                <div>
                  <p className="text-xs text-muted-foreground">Rain Prob.</p>
                  <p className="font-medium">10%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Temperature Trend */}
        <Card className="md:col-span-7 lg:col-span-8 shadow-sm">
          <CardHeader>
            <CardTitle>Today's Temperature Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}°`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} 
                  />
                  <Area type="monotone" dataKey="temp" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5-Day Forecast */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>5-Day Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center overflow-x-auto pb-2 gap-4">
            {dailyForecast.map((day, i) => {
              const Icon = day.icon;
              return (
                <div key={i} className="flex flex-col items-center min-w-[80px] p-4 rounded-xl hover:bg-accent transition-colors">
                  <span className="font-medium text-muted-foreground mb-2">{day.day}</span>
                  <Icon className="w-8 h-8 text-primary mb-3" />
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-bold">{day.high}°</span>
                    <span className="text-muted-foreground">{day.low}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Weather;