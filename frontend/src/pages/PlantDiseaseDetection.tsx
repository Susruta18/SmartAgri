import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon, RefreshCw, UploadCloud, Leaf, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { predictPlantDisease, type PredictionResult } from '@/services/plantDiseaseApi';
import { captureImage } from '@/services/cameraService';

const PlantDiseaseDetection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Client-side validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setError(null);
    setResult(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleTakePhoto = async () => {
    setError(null);
    setResult(null);
    
    const camResult = await captureImage();
    
    if (camResult.success && camResult.image) {
      try {
        // Convert base64 to File object
        const res = await fetch(camResult.image.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `camera-capture-${Date.now()}.${camResult.image.format}`, { type: `image/${camResult.image.format}` });
        processFile(file);
      } catch (e) {
        setError('Failed to process captured image.');
      }
    } else if (camResult.error !== 'USER_CANCELLED') {
      setError(camResult.errorMessage || 'Failed to capture image.');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await predictPlantDisease(selectedFile, selectedFile.name);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Plant Disease AI</h1>
          <p className="text-muted-foreground mt-1">Upload or capture an image of a crop leaf to detect diseases.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Image Input */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Image Input</CardTitle>
              <CardDescription>Select a clear image of the affected leaf.</CardDescription>
            </CardHeader>
            <CardContent>
              {!previewUrl ? (
                <div 
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer min-h-[300px]"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload image area. Click or drag and drop an image here."
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  <UploadCloud className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Drag & drop an image here, or click to browse</p>
                  <p className="text-xs text-slate-500 mt-2">Supports JPG, PNG, WEBP (Max 10MB)</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    aria-label="File input"
                  />
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden border bg-slate-100 min-h-[300px] flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="Selected crop leaf for analysis" 
                    className="w-full h-auto max-h-[400px] object-contain"
                  />
                  <button 
                    onClick={clearSelection}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                {!previewUrl && (
                  <Button onClick={handleTakePhoto} variant="secondary" className="flex-1" aria-label="Take photo with camera">
                    <Camera className="mr-2 h-4 w-4" /> Take Photo
                  </Button>
                )}
                {previewUrl && (
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing} 
                    className="flex-1"
                    size="lg"
                    aria-label={isAnalyzing ? "Analyzing image..." : "Analyze Image"}
                  >
                    {isAnalyzing ? (
                      <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Leaf className="mr-2 h-5 w-5" /> Analyze Image</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-4">
          {error && (
            <div className="p-4 rounded-md border bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50 flex gap-3" role="alert">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Error</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {isAnalyzing && !error && (
            <Card className="shadow-sm h-full flex items-center justify-center min-h-[300px]">
              <div className="text-center p-6 space-y-4">
                <RefreshCw className="h-10 w-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground font-medium" aria-live="polite">AI is analyzing the leaf pattern...</p>
              </div>
            </Card>
          )}

          {!isAnalyzing && !result && !error && (
            <Card className="shadow-sm h-full flex items-center justify-center min-h-[300px] border-dashed">
              <div className="text-center p-6 space-y-3">
                <ImageIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-muted-foreground">Upload an image and click Analyze to see AI predictions.</p>
              </div>
            </Card>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Main Prediction */}
              <Card className="shadow-md overflow-hidden border-2 border-primary/20">
                <div className={`h-2 w-full ${result.is_healthy ? 'bg-green-500' : 'bg-red-500'}`} />
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Primary Prediction</p>
                      <h2 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                        {result.disease === 'healthy' ? 'Healthy' : result.disease}
                      </h2>
                      <p className="text-md text-slate-600 dark:text-slate-300 mt-1">Crop: <span className="font-semibold">{result.crop}</span></p>
                    </div>
                    
                    <div className="text-right">
                      <div className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                        <span className="text-2xl font-bold text-primary">{result.confidence.toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Confidence</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    {result.is_healthy ? (
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium">
                        <Leaf className="mr-1.5 h-4 w-4" /> Healthy Plant
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-sm font-medium">
                        <AlertTriangle className="mr-1.5 h-4 w-4" /> Disease Detected
                      </div>
                    )}
                  </div>
                  
                  {/* Confidence Warning */}
                  {result.confidence < 75 && (
                    <div className="mt-6 p-4 rounded-md border bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/50 flex gap-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm"><strong>AI confidence is low.</strong> Please capture a clearer image of the affected leaf and try again.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alternative Predictions */}
              {result.top_3 && result.top_3.length > 1 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Alternative predictions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.top_3.slice(1).map((alt, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border">
                          <div>
                            <p className="font-medium text-sm text-slate-800 dark:text-slate-200">
                              {alt.disease === 'healthy' ? 'Healthy' : alt.disease}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{alt.crop}</p>
                          </div>
                          <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                            {alt.confidence.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlantDiseaseDetection;
