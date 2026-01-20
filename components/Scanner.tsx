import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { identifyItemFromImage } from '../services/geminiService';
import { InventoryItem } from '../types';

interface ScannerProps {
  onScanComplete: (item: Partial<InventoryItem>) => void;
  onClose: () => void;
  isEmergency: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose, isEmergency }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("カメラにアクセスできません。権限を確認するか、手動入力を利用してください。");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        // Stop stream to save battery/resources while analyzing
        if (stream) stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [stream]);

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const analyze = async () => {
    if (!capturedImage) return;
    
    setIsAnalyzing(true);
    // Remove data:image/jpeg;base64, prefix
    const base64Data = capturedImage.split(',')[1];

    try {
      const result = await identifyItemFromImage(base64Data);
      onScanComplete(result);
    } catch (err) {
      setError("AI解析に失敗しました。再試行するか、手動で入力してください。");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10">
         <h2 className="text-white font-semibold text-lg">商品をスキャン</h2>
         <button onClick={onClose} className="text-white p-2 rounded-full bg-white/10 backdrop-blur-md">
            <X size={24} />
         </button>
      </div>

      {/* Viewport */}
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {error ? (
           <div className="text-white text-center p-6">
             <p className="mb-4">{error}</p>
             <Button variant="secondary" onClick={onClose}>閉じる</Button>
           </div>
        ) : !capturedImage ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        )}
        
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay Guides if scanning */}
        {!capturedImage && !error && (
          <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-500"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-500"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-500"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-500"></div>
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        {isAnalyzing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                <RefreshCw className="animate-spin mb-4" size={48} />
                <p>Gemini AIが解析中...</p>
            </div>
        )}
      </div>

      {/* Controls */}
      {!error && (
        <div className="absolute bottom-0 w-full p-8 pb-12 flex justify-center gap-8 items-center bg-gradient-to-t from-black/80 to-transparent">
            {!capturedImage ? (
                <button 
                onClick={capture}
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-95 ${isEmergency ? 'border-emergency-500 bg-white/20' : 'border-brand-500 bg-white/20'}`}
                >
                <div className={`w-16 h-16 rounded-full ${isEmergency ? 'bg-emergency-500' : 'bg-brand-500'}`}></div>
                </button>
            ) : (
                <>
                <Button onClick={retake} variant="secondary" className="bg-white text-black">
                    <RefreshCw size={20} /> 再撮影
                </Button>
                <Button onClick={analyze} variant="primary" isEmergency={isEmergency}>
                    <Check size={20} /> この写真を使う
                </Button>
                </>
            )}
        </div>
      )}
    </div>
  );
};