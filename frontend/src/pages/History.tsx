import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';

const dailyData = [
  { time: '00:00', moisture: 42, temp: 20, humidity: 65, light: 100, water: 80 },
  { time: '04:00', moisture: 41, temp: 18, humidity: 70, light: 50, water: 78 },
  { time: '08:00', moisture: 40, temp: 22, humidity: 60, light: 600, water: 75 },
  { time: '12:00', moisture: 38, temp: 28, humidity: 45, light: 1200, water: 70 },
  { time: '16:00', moisture: 36, temp: 29, humidity: 42, light: 900, water: 65 },
  { time: '20:00', moisture: 45, temp: 24, humidity: 55, light: 200, water: 60 },
];

const weeklyData = [
  { day: 'Mon', moisture: 45, temp: 24, humidity: 55, light: 800, water: 80 },
  { day: 'Tue', moisture: 42, temp: 26, humidity: 50, light: 900, water: 75 },
  { day: 'Wed', moisture: 38, temp: 29, humidity: 45, light: 1000, water: 65 },
  { day: 'Thu', moisture: 35, temp: 31, humidity: 40, light: 1100, water: 55 },
  { day: 'Fri', moisture: 55, temp: 23, humidity: 70, light: 500, water: 90 }, // Rain event
  { day: 'Sat', moisture: 50, temp: 25, humidity: 65, light: 750, water: 85 },
  { day: 'Sun', moisture: 48, temp: 27, humidity: 60, light: 850, water: 80 },
];

const monthlyData = [
  { week: 'Week 1', moisture: 48, temp: 23, humidity: 62 },
  { week: 'Week 2', moisture: 42, temp: 26, humidity: 55 },
  { week: 'Week 3', moisture: 39, temp: 28, humidity: 48 },
  { week: 'Week 4', moisture: 52, temp: 24, humidity: 65 },
];

const History: React.FC = () => {
  const [activeTab, setActiveTab] = useState('daily');

  const getData = (): any[] => {
    switch (activeTab) {
      case 'weekly': return weeklyData;
      case 'monthly': return monthlyData;
      default: return dailyData;
    }
  };

  const getXKey = () => {
    switch (activeTab) {
      case 'weekly': return 'day';
      case 'monthly': return 'week';
      default: return 'time';
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics & History</h1>
        <p className="text-muted-foreground">Historical trends and analytics for your farm sensors.</p>
      </div>

      <Tabs defaultValue="daily" onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-6 animate-in fade-in-50 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Soil Moisture & Humidity */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Moisture & Humidity</CardTitle>
                <CardDescription>Correlation between soil moisture and air humidity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey={getXKey()} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
                      <Legend />
                      <Line type="monotone" dataKey="moisture" name="Soil Moisture (%)" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="humidity" name="Air Humidity (%)" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Temperature Trends */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Temperature Trends</CardTitle>
                <CardDescription>Average air temperature variations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey={getXKey()} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}°C`} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
                      <Legend />
                      <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Water Level */}
            {activeTab !== 'monthly' && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Tank Water Level</CardTitle>
                  <CardDescription>Irrigation tank water level over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey={getXKey()} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
                        <Area type="monotone" dataKey="water" name="Water Level (%)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWater)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Light Intensity */}
            {activeTab !== 'monthly' && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Light Intensity</CardTitle>
                  <CardDescription>Sunlight exposure measured in Lux</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey={getXKey()} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
                        <Bar dataKey="light" name="Light Intensity (Lux)" fill="#eab308" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;