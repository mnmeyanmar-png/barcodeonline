import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Input, Button, SpinnerIcon, DownloadIcon, TrashIcon, ToggleSwitch } from './components/ui';
import { supabase } from './supabaseClient';

// A4 dimensions and DPI constants
const A4_PORTRAIT_WIDTH_INCHES = 8.27;
const A4_PORTRAIT_HEIGHT_INCHES = 11.69;
const DPI = 300;

type ValidationStatus = 'idle' | 'loading' | 'success' | 'error';

interface BarcodeGroup {
  id: number;
  inputValue: string;
  url: string;
  title: string;
  horizontalCount: number;
  verticalCount: number;
  marginTop: number;
  validationStatus: ValidationStatus;
}

const BarcodeGenerator = () => {
  const [barcodeGroups, setBarcodeGroups] = useState<BarcodeGroup[]>([
    {
      id: Date.now(),
      inputValue: '123',
      url: '', 
      title: '',
      horizontalCount: 5,
      verticalCount: 10,
      marginTop: 0.5,
      validationStatus: 'loading',
    }
  ]);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const updateGroup = (idToUpdate: number, field: keyof BarcodeGroup, value: string | number | ValidationStatus) => {
     setBarcodeGroups(prev => prev.map(group => 
        group.id === idToUpdate ? { ...group, [field]: value } : group
     ));
  };
  
  useEffect(() => {
    const handler = setTimeout(async () => {
      const groupToProcess = barcodeGroups.find(g => g.validationStatus === 'loading');
      if (!groupToProcess) return;
      const { id, inputValue } = groupToProcess;
      setError(null);
      if (inputValue.startsWith('http')) {
        updateGroup(id, 'url', inputValue);
        updateGroup(id, 'validationStatus', 'success');
        return;
      }
      if (inputValue.trim() === '') {
        updateGroup(id, 'url', '');
        updateGroup(id, 'validationStatus', 'idle');
        return;
      }
      try {
        const { data, error: dbError } = await supabase.from('barcodes').select('image_url').eq('barcode_number', inputValue).single();
        if (dbError) {
          setError(`Barcode number "${inputValue}" not found.`);
          updateGroup(id, 'url', '');
          updateGroup(id, 'validationStatus', 'error');
          return;
        }
        if (data && data.image_url) {
          updateGroup(id, 'url', data.image_url);
          updateGroup(id, 'validationStatus', 'success');
        } else {
          setError(`Barcode number "${inputValue}" not found.`);
          updateGroup(id, 'url', '');
          updateGroup(id, 'validationStatus', 'error');
        }
      } catch (err) {
        setError('An error occurred while fetching data.');
        updateGroup(id, 'url', '');
        updateGroup(id, 'validationStatus', 'error');
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [barcodeGroups]);

  const drawOnCanvas = useCallback(async (canvas: HTMLCanvasElement, groups: BarcodeGroup[], isPreview: boolean) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const A4_WIDTH_INCHES = orientation === 'portrait' ? A4_PORTRAIT_WIDTH_INCHES : A4_PORTRAIT_HEIGHT_INCHES;
    const A4_HEIGHT_INCHES = orientation === 'portrait' ? A4_PORTRAIT_HEIGHT_INCHES : A4_PORTRAIT_WIDTH_INCHES;
    const A4_WIDTH_PX = A4_WIDTH_INCHES * DPI;
    const A4_HEIGHT_PX = A4_HEIGHT_INCHES * DPI;
    const logicalCanvasWidth = isPreview ? canvas.offsetWidth : A4_WIDTH_PX;
    const logicalCanvasHeight = isPreview ? canvas.offsetHeight : A4_HEIGHT_PX;
    if (isPreview) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = logicalCanvasWidth * dpr;
        canvas.height = logicalCanvasHeight * dpr;
        ctx.scale(dpr, dpr);
    } else {
        canvas.width = A4_WIDTH_PX;
        canvas.height = A4_HEIGHT_PX;
    }
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, logicalCanvasWidth, logicalCanvasHeight);
    const validGroups = groups.filter(g => g.url.trim() !== '' && g.horizontalCount > 0 && g.verticalCount > 0);
    if (validGroups.length === 0) return;
    const drawContent = async () => {
      let currentYOffset = 0;
      for (const group of validGroups) {
        currentYOffset += group.marginTop * DPI;
        if (group.title && group.title.trim() !== '') {
            const fontSizePt = 16;
            const fontSizePx = (fontSizePt / 72) * DPI;
            ctx.font = `bold ${fontSizePx}px sans-serif`;
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            const textX = A4_WIDTH_PX / 2;
            const textY = currentYOffset + fontSizePx;
            ctx.fillText(group.title, textX, textY);
            const titlePadding = fontSizePx * 0.5;
            currentYOffset += fontSizePx + titlePadding;
        }
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`Failed to load: ${group.url.substring(0, 50)}...`));
          image.src = group.url;
        });
        let barcodeWidth = img.naturalWidth;
        let barcodeHeight = img.naturalHeight;
        if (group.url.toLowerCase().endsWith('.svg')) {
            const assumedBrowserDpi = 96;
            const scaleFactor = DPI / assumedBrowserDpi;
            barcodeWidth *= scaleFactor;
            barcodeHeight *= scaleFactor;
        }
        if (barcodeWidth === 0 || barcodeHeight === 0) {
           throw new Error(`Image from ${group.url.substring(0, 50)}... has zero dimensions.`);
        }
        const groupGridWidth = group.horizontalCount * barcodeWidth;
        const groupGridHeight = group.verticalCount * barcodeHeight;
        if (currentYOffset + groupGridHeight > A4_HEIGHT_PX) {
            throw new Error('Content overflows A4 page. Reduce counts or increase margins.');
        }
        const startX = (A4_WIDTH_PX - groupGridWidth) / 2;
        const startY = currentYOffset;
        for (let y = 0; y < group.verticalCount; y++) {
          for (let x = 0; x < group.horizontalCount; x++) {
            const drawX = startX + x * barcodeWidth;
            const drawY = startY + y * barcodeHeight;
            ctx.drawImage(img, drawX, drawY, barcodeWidth, barcodeHeight);
          }
        }
        currentYOffset += groupGridHeight;
      }
    }
    try {
      if (isPreview) {
          const scaleToFit = Math.min(logicalCanvasWidth / A4_WIDTH_PX, logicalCanvasHeight / A4_HEIGHT_PX);
          ctx.save();
          ctx.scale(scaleToFit, scaleToFit);
          await drawContent();
          ctx.restore();
      } else {
          await drawContent();
      }
      if (error) setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      ctx.fillRect(0, 0, logicalCanvasWidth, logicalCanvasHeight);
    }
  }, [orientation, error]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (canvas) {
      const debounceTimeout = setTimeout(() => {
        drawOnCanvas(canvas, barcodeGroups, true);
      }, 300);
      return () => clearTimeout(debounceTimeout);
    }
  }, [JSON.stringify(barcodeGroups), drawOnCanvas]);
  
  const handleAddGroup = () => {
    setBarcodeGroups(prev => [...prev, { id: Date.now(), inputValue: '', url: '', title: '', horizontalCount: 5, verticalCount: 10, marginTop: 0.1, validationStatus: 'idle' }]);
  };

  const handleRemoveGroup = (idToRemove: number) => {
    setBarcodeGroups(prev => prev.filter(b => b.id !== idToRemove));
  };
  
  const handleInputChange = (id: number, value: string) => {
    setBarcodeGroups(prev => prev.map(group => 
      group.id === id 
        ? { ...group, inputValue: value, validationStatus: 'loading' } 
        : group
    ));
  };

  const handleGenerateAndDownload = async () => {
    setIsLoading(true);
    setError(null);
    const offscreenCanvas = document.createElement('canvas');
    await drawOnCanvas(offscreenCanvas, barcodeGroups, false);
    
    offscreenCanvas.toBlob((blob) => {
        if (blob) {
          const firstGroup = barcodeGroups[0];
          const fileName = firstGroup?.title?.trim() || firstGroup?.inputValue?.trim() || 'barcode-sheet';
            const link = document.createElement('a');
            link.download = `${fileName}.png`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } else {
            setError("Failed to create image blob. The canvas may be empty or too large.");
        }
        setIsLoading(false);
    }, 'image/png');
  };
  
  const isDownloadDisabled = isLoading || barcodeGroups.some(g => g.validationStatus !== 'success' || g.horizontalCount <= 0 || g.verticalCount <= 0);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
        <Button variant="outline" onClick={() => supabase.auth.signOut()} className="absolute top-4 right-4 w-auto">
            Sign Out
        </Button>
      <div className="w-full max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Barcode Sheet Generator</h1>
          <p className="mt-2 text-lg text-slate-400">Create printable A4 sheets with your barcodes</p>
        </header>
        
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
              <div className="p-6 space-y-6 bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-white">Configuration</h2>
                <ToggleSwitch
                  label="Landscape Orientation"
                  enabled={orientation === 'landscape'}
                  onChange={(enabled) => setOrientation(enabled ? 'landscape' : 'portrait')}
                />
                <div className="space-y-6">
                    {barcodeGroups.map((group, index) => (
                      <Card key={group.id} className="bg-slate-900/50 p-4 relative">
                         {barcodeGroups.length > 1 && (
                         <button 
                           onClick={() => handleRemoveGroup(group.id)}
                           className="absolute top-2 right-2 flex-shrink-0 p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                           aria-label="Remove barcode group"
                         >
                           <TrashIcon />
                         </button>
                       )}
                        <div className="space-y-4">
                          <Input
                              label={`Barcode URL or Number ${index + 1}`}
                              id={`barcode-url-${group.id}`}
                              type="text"
                              value={group.inputValue}
                              onChange={(e) => handleInputChange(group.id, e.target.value)}
                              placeholder="Enter URL or Barcode Number"
                              validationStatus={group.validationStatus}
                            />
                           <Input
                              label="Title (Optional)"
                              id={`title-${group.id}`}
                              type="text"
                              value={group.title}
                              onChange={(e) => updateGroup(group.id, 'title', e.target.value)}
                              placeholder="e.g. Product Batch A"
                            />
                           <Input
                                label="Margin Top (in)"
                                id={`margin-top-${group.id}`}
                                type="number"
                                value={group.marginTop.toString()}
                                onChange={(e) => updateGroup(group.id, 'marginTop', Math.max(0, parseFloat(e.target.value) || 0))}
                                min="0"
                                step="0.01"
                              />
                          <div className="grid grid-cols-2 gap-4">
                              <Input
                                label="Horizontal Count"
                                id={`horizontal-count-${group.id}`}
                                type="number"
                                value={group.horizontalCount.toString()}
                                onChange={(e) => updateGroup(group.id, 'horizontalCount', Math.max(0, parseInt(e.target.value, 10) || 0))}
                                min="1"
                              />
                              <Input
                                label="Vertical Count"
                                id={`vertical-count-${group.id}`}
                                type="number"
                                value={group.verticalCount.toString()}
                                onChange={(e) => updateGroup(group.id, 'verticalCount', Math.max(0, parseInt(e.target.value, 10) || 0))}
                                min="1"
                              />
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
                 <Button onClick={handleAddGroup} variant="outline" className="w-full">
                  + Add Another Barcode Group
                </Button>
                
                <div className="pt-2">
                  <Button onClick={handleGenerateAndDownload} disabled={isDownloadDisabled} className="w-full">
                    {isLoading ? <SpinnerIcon /> : <DownloadIcon />}
                    <span>{isLoading ? 'Generating...' : 'Generate & Download A4'}</span>
                  </Button>
                </div>
                
                {error && <p className="text-red-400 bg-red-900/20 p-3 rounded-md text-sm">{error}</p>}
              </div>
          </div>
          
          <div className="lg:col-span-2">
            <Card>
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Live Preview</h2>
                    <div className={`aspect-[${orientation === 'portrait' ? '1/1.414' : '1.414/1'}] bg-slate-800 rounded-lg overflow-hidden border border-slate-700 transition-all`}>
                        <canvas ref={previewCanvasRef} className="w-full h-full object-contain" />
                    </div>
                     <p className="text-center text-sm text-slate-500 mt-2">This is a scaled-down preview. The downloaded file will be a full-resolution 300 DPI A4 image.</p>
                </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BarcodeGenerator;

