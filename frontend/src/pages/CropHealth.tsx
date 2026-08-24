import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Camera, RotateCcw, Leaf, ShieldAlert, CheckCircle2,
  Upload, Loader2, AlertTriangle, Microscope,
  ChevronRight, Clock, ImageOff
} from 'lucide-react';
import { cn } from '@/utils';
import { captureImage } from '@/services/cameraService';
import { useCropUpload, useCropHistory } from '@/hooks/useCropAnalysis';
import type { AnalysisResult } from '@/hooks/useCropAnalysis';

// ── Severity helpers ──────────────────────────────────────────────────────────
const getSeverityConfig = (severity: string) => {
  switch (severity) {
    case 'High':
      return {
        color: 'bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400',
        bar: 'bg-red-500',
        label: 'High',
      };
    case 'Moderate':
      return {
        color: 'bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400',
        bar: 'bg-amber-500',
        label: 'Moderate',
      };
    case 'Low':
      return {
        color: 'bg-blue-500/20 text-blue-600 border-blue-500/30 dark:text-blue-400',
        bar: 'bg-blue-500',
        label: 'Low',
      };
    case 'None':
    default:
      return {
        color: 'bg-green-500/20 text-green-600 border-green-500/30 dark:text-green-400',
        bar: 'bg-green-500',
        label: 'None',
      };
  }
};

// ── Camera Flow States ────────────────────────────────────────────────────────
type FlowState = 'idle' | 'captured' | 'uploading' | 'analyzing' | 'result' | 'error';

const CropHealth: React.FC = () => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const { mutateAsync: uploadAndAnalyze } = useCropUpload();
  const { data: historyData } = useCropHistory();

  // ── Capture image using native phone camera ───────────────────────────────
  const handleCapture = async () => {
    setCameraError(null);
    const cameraResult = await captureImage();

    if (!cameraResult.success || !cameraResult.image) {
      if (cameraResult.error !== 'USER_CANCELLED') {
        setCameraError(cameraResult.errorMessage || 'Failed to capture image.');
        setFlowState('error');
      }
      return;
    }

    setCapturedImageUrl(cameraResult.image.dataUrl);
    setCapturedBase64(cameraResult.image.base64); // Raw base64, no data URI prefix
    setFlowState('captured');
  };

  // ── Retake ────────────────────────────────────────────────────────────────
  const handleRetake = () => {
    setCapturedImageUrl(null);
    setCapturedBase64(null);
    setResult(null);
    setFlowState('idle');
  };

  // ── Upload + AI analysis ──────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!capturedBase64) return;

    try {
      setFlowState('uploading');
      // Brief pause to simulate network transition/progress so user can read "Uploading"
      await new Promise((r) => setTimeout(r, 800)); 
      
      // In a real app we'd track true upload progress via axios config, 
      // but for this phase we transition states sequentially.
      setFlowState('analyzing');

      const analysisResult = await uploadAndAnalyze({
        imageBase64: capturedBase64,
        capturedAt: new Date().toISOString(),
      });

      setResult(analysisResult);
      setFlowState('result');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Analysis failed. Please try again.';
      setCameraError(msg);
      setFlowState('error');
    }
  };

  const severity = result ? getSeverityConfig(result.severity) : null;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Crop Health</h1>
        <p className="text-muted-foreground">
          Use your phone camera to detect diseases in your crops via AI.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Left: Camera / Image Panel ── */}
        <div className="lg:col-span-7 space-y-4">

          {/* Camera Card */}
          <Card className="overflow-hidden border-primary/10 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Crop Image Capture
                  </CardTitle>
                  <CardDescription>
                    Take a photo of your crop or leaf for AI disease detection
                  </CardDescription>
                </div>
                {flowState === 'result' && result && (
                  <Badge
                    variant={result.disease === 'Healthy' ? 'default' : 'destructive'}
                    className="text-sm py-1 px-3"
                  >
                    {result.disease === 'Healthy' ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Healthy</>
                    ) : (
                      <><ShieldAlert className="w-3.5 h-3.5 mr-1" /> Disease Detected</>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Image Preview Area */}
              <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/30 aspect-video flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {/* IDLE: No image yet */}
                  {flowState === 'idle' && !capturedImageUrl && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-4 p-8 text-center"
                    >
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Leaf className="h-10 w-10 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">No image captured</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Tap "Capture Crop Image" to open your camera
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* CAPTURED / RESULT: Show photo */}
                  {capturedImageUrl && (
                    <motion.img
                      key="image"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      src={capturedImageUrl}
                      alt="Captured crop"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* UPLOADING overlay */}
                  {flowState === 'uploading' && (
                    <motion.div
                      key="uploading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
                    >
                      <Upload className="h-10 w-10 text-white animate-bounce" />
                      <p className="text-white font-semibold text-lg">Uploading image...</p>
                      <p className="text-white/70 text-sm">Sending to secure cloud storage</p>
                    </motion.div>
                  )}

                  {/* ANALYZING overlay */}
                  {flowState === 'analyzing' && (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
                    >
                      <Microscope className="h-10 w-10 text-primary" />
                      <p className="text-white font-semibold text-lg">Analyzing crop image...</p>
                      <p className="text-white/70 text-sm">AI is scanning for disease patterns</p>
                      <div className="flex gap-1 mt-2">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-primary"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Camera/Upload Error */}
              {cameraError && flowState === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Analysis Failed</p>
                    <p className="text-destructive/80 mt-0.5">{cameraError}</p>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {/* IDLE / ERROR (if no image): Only Capture button */}
                {((flowState === 'idle') || (flowState === 'error' && !capturedImageUrl)) && (
                  <Button
                    id="capture-crop-btn"
                    onClick={handleCapture}
                    className="w-full gap-2 h-12 text-base font-semibold"
                    size="lg"
                  >
                    <Camera className="h-5 w-5" />
                    Capture Crop Image
                  </Button>
                )}

                {/* CAPTURED / ERROR (if we have image): Retake + Analyze/Retry */}
                {(flowState === 'captured' || (flowState === 'error' && capturedImageUrl)) && (
                  <>
                    <Button
                      id="retake-btn"
                      onClick={handleRetake}
                      variant="outline"
                      className="flex-1 gap-2 h-12"
                      size="lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retake
                    </Button>
                    <Button
                      id="analyze-btn"
                      onClick={handleAnalyze}
                      className="flex-1 gap-2 h-12 text-base font-semibold"
                      size="lg"
                    >
                      {flowState === 'error' ? <RotateCcw className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                      {flowState === 'error' ? 'Retry Upload' : 'Use Photo & Analyze'}
                    </Button>
                  </>
                )}

                {/* UPLOADING / ANALYZING: Disabled state */}
                {(flowState === 'uploading' || flowState === 'analyzing') && (
                  <Button className="w-full h-12" disabled size="lg">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {flowState === 'uploading' ? 'Uploading...' : 'Analyzing...'}
                  </Button>
                )}

                {/* RESULT: New capture */}
                {flowState === 'result' && (
                  <Button
                    id="new-capture-btn"
                    onClick={handleRetake}
                    variant="outline"
                    className="w-full gap-2 h-12"
                    size="lg"
                  >
                    <Camera className="h-4 w-4" />
                    New Capture
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Treatment Plan — shown when disease detected */}
          {flowState === 'result' && result && result.disease !== 'Healthy' && result.modelConfigured && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10">
                <CardHeader>
                  <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2 text-base">
                    <ShieldAlert className="w-5 h-5" />
                    Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {result.recommendation}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* ── Right: AI Results + History Panel ── */}
        <div className="lg:col-span-5 space-y-4">

          {/* AI Analysis Results Card */}
          <Card className="shadow-md border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Microscope className="w-5 h-5 text-primary" />
                AI Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">

                {/* Waiting for capture */}
                {flowState === 'idle' && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-10 gap-3 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Capture a crop image to see AI analysis results here
                    </p>
                  </motion.div>
                )}

                {/* Image captured, waiting to analyze */}
                {flowState === 'captured' && (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-10 gap-3 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Image Ready</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tap "Use Photo & Analyze" to start AI disease detection
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Loading states */}
                {(flowState === 'uploading' || flowState === 'analyzing') && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-10 gap-4"
                  >
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {flowState === 'uploading' ? 'Uploading to cloud...' : 'Running AI analysis...'}
                    </p>
                  </motion.div>
                )}

                {/* Error state */}
                {flowState === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-10 gap-3 text-center"
                  >
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                    <p className="text-sm text-muted-foreground">
                      Analysis could not be completed. You can try again.
                    </p>
                  </motion.div>
                )}

                {/* RESULT */}
                {flowState === 'result' && result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    {/* Model not configured warning */}
                    {!result.modelConfigured && (
                      <div className="flex items-start gap-3 p-3 bg-muted border border-border rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">AI model is not configured</p>
                          <p className="text-muted-foreground mt-0.5">
                            The image was saved. Connect a trained disease detection model to enable predictions.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Disease name */}
                    {result.modelConfigured && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Detected Disease</p>
                          <p className="text-2xl font-bold text-foreground leading-tight">
                            {result.disease}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Confidence */}
                          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                            <p className="text-2xl font-bold text-primary">{result.confidence}%</p>
                            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-700"
                                style={{ width: `${result.confidence}%` }}
                              />
                            </div>
                          </div>

                          {/* Severity */}
                          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-2">Severity</p>
                            {severity && (
                              <>
                                <Badge
                                  variant="outline"
                                  className={cn('px-2 py-1 text-sm font-semibold', severity.color)}
                                >
                                  {severity.label}
                                </Badge>
                                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full', severity.bar)}
                                    style={{
                                      width:
                                        result.severity === 'High' ? '100%' :
                                        result.severity === 'Moderate' ? '60%' :
                                        result.severity === 'Low' ? '30%' : '10%'
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                            Recommendation
                          </p>
                          <p className="text-sm leading-relaxed p-3 bg-primary/5 border border-primary/20 rounded-lg text-foreground/90">
                            {result.recommendation}
                          </p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Recent Scans History */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!historyData || historyData.records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <ImageOff className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No scan history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyData.records.slice(0, 5).map((record) => (
                    <div
                      key={record.imageId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    >
                      <div className="w-14 h-11 rounded-md overflow-hidden shrink-0 border border-border/50 bg-muted">
                        {record.imageUrl ? (
                          <img
                            src={record.imageUrl}
                            alt="scan"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {record.analysis?.disease || 'Pending analysis'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.capturedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <div
                          className={cn(
                            'w-2.5 h-2.5 rounded-full',
                            !record.analysis ? 'bg-muted-foreground' :
                            record.analysis.disease === 'Healthy' ? 'bg-green-500' : 'bg-red-500'
                          )}
                        />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CropHealth;