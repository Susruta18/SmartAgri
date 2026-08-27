import React, { useState, useEffect } from 'react';
import { 
  getSensorPreview, 
  createObservation, 
  getStats, 
  exportDataset, 
  type SensorPreview, 
  type StatsData 
} from '@/services/cropHealthApi';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Leaf, AlertTriangle, CheckCircle, RefreshCw, Download, Info } from 'lucide-react';

type HealthStatus = 'Healthy' | 'Stressed' | 'Severely_Stressed';

const CropHealthDataCollection: React.FC = () => {
  const [crop, setCrop] = useState('Wheat');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [observerNotes, setObserverNotes] = useState('');
  const [timestamp, setTimestamp] = useState(() => {
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  
  const [preview, setPreview] = useState<SensorPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [stats, setStats] = useState<StatsData | null>(null);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handlePreview = async () => {
    if (!timestamp) return;
    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreview(null);
    setSubmitMessage(null);
    try {
      const date = new Date(timestamp);
      const data = await getSensorPreview(date.toISOString());
      setPreview(data);
    } catch (err: any) {
      setPreviewError(err.response?.data?.message || 'Failed to fetch sensor preview.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSubmit = async () => {
    if (!crop || !healthStatus || !timestamp || !preview) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const date = new Date(timestamp);
      await createObservation({
        crop,
        healthStatus,
        observationTimestamp: date.toISOString(),
        observerNotes,
      });
      setSubmitMessage({ type: 'success', text: 'Crop health observation saved successfully.' });
      
      // Reset form partially
      setHealthStatus(null);
      setObserverNotes('');
      setPreview(null);
      
      // Refresh stats
      fetchStats();
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit observation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportDataset();
      alert('Dataset exported successfully to datasets/crop_health_training.csv');
    } catch (err: any) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Crop Health Data Collection</h1>
        <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
          <Download size={16} /> Export ML Dataset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New Observation</CardTitle>
              <CardDescription>Record ground-truth plant health.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitMessage && (
                <div className={`p-4 rounded-md border flex gap-3 ${submitMessage.type === 'success' ? 'bg-green-50 text-green-900 border-green-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
                  <div className="mt-0.5">
                    {submitMessage.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                  </div>
                  <div>
                    <h5 className="font-semibold">{submitMessage.type === 'success' ? 'Success' : 'Error'}</h5>
                    <p className="text-sm mt-1">{submitMessage.text}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Crop Type</label>
                  <Input value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="e.g. Wheat" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observation Time</label>
                  <Input type="datetime-local" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Health Status</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button 
                    variant={healthStatus === 'Healthy' ? 'default' : 'outline'}
                    className={healthStatus === 'Healthy' ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={() => setHealthStatus('Healthy')}
                    size="lg"
                  >
                    <Leaf className="mr-2 h-4 w-4" /> Healthy
                  </Button>
                  <Button 
                    variant={healthStatus === 'Stressed' ? 'default' : 'outline'}
                    className={healthStatus === 'Stressed' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                    onClick={() => setHealthStatus('Stressed')}
                    size="lg"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" /> Stressed
                  </Button>
                  <Button 
                    variant={healthStatus === 'Severely_Stressed' ? 'default' : 'outline'}
                    className={healthStatus === 'Severely_Stressed' ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => setHealthStatus('Severely_Stressed')}
                    size="lg"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" /> Severely Stressed
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Observer Notes (Optional)</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="E.g., visible wilting on lower leaves..." 
                  value={observerNotes} 
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObserverNotes(e.target.value)} 
                />
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handlePreview} disabled={isLoadingPreview || !timestamp} variant="secondary" className="w-full">
                  {isLoadingPreview ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : 'Preview Matched Sensor Data'}
                </Button>
              </div>

              {previewError && (
                <div className="p-4 rounded-md border bg-red-50 text-red-900 border-red-200 flex gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <h5 className="font-semibold">Sensor Match Failed</h5>
                    <p className="text-sm mt-1">{previewError}</p>
                  </div>
                </div>
              )}

              {preview && (
                <div className="bg-slate-50 p-4 rounded-md border text-sm space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700">Matched Sensor Data</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Matched: {Math.abs(preview.timeDifferenceMinutes)} minutes {preview.timeDifferenceMinutes < 0 ? 'before' : 'after'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-600">
                    <div>Soil Moisture: <span className="font-medium text-slate-900">{preview.soilMoisture}%</span></div>
                    <div>Air Temp: <span className="font-medium text-slate-900">{preview.airTemperature}°C</span></div>
                    <div>Humidity: <span className="font-medium text-slate-900">{preview.humidity}%</span></div>
                    <div>Light: <span className="font-medium text-slate-900">{preview.lightIntensity} lux</span></div>
                  </div>
                </div>
              )}

            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubmit} 
                disabled={!healthStatus || !preview || isSubmitting} 
                className="w-full text-lg h-12"
              >
                {isSubmitting ? 'Saving...' : 'Submit Observation'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Dashboard */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info size={20}/> Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">{stats.totalObservations}</div>
                    <div className="text-sm text-slate-500">Total Observations</div>
                  </div>
                  
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Healthy</span>
                      <span className="font-semibold">{stats.healthyCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Stressed</span>
                      <span className="font-semibold">{stats.stressedCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Severely Stressed</span>
                      <span className="font-semibold">{stats.severelyStressedCount}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4 text-sm text-slate-600">
                    <div><strong>Crops:</strong> {stats.uniqueCrops.join(', ') || 'None'}</div>
                    <div><strong>Devices:</strong> {stats.uniqueDevices.join(', ') || 'None'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-sm py-4">Loading stats...</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CropHealthDataCollection;
