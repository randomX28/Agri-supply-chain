import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function ScannerModal({ onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [errorMSG, setErrorMSG] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMSG(''); // Clear previous errors
    
    // Stop camera to focus on file processing
    setIsScanning(false);
    stopTracks();

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Use an in-memory canvas for better reliability and isolation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Scale handling: avoid huge images which can slow down jsQR
        const MAX_SIZE = 1000;
        let width = img.width;
        let height = img.height;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = (height / width) * MAX_SIZE;
            width = MAX_SIZE;
          } else {
            width = (width / height) * MAX_SIZE;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'both', // Better detection for various lightings/themes
          });

          if (code && code.data) {
            onScan(code.data);
          } else {
            setErrorMSG("No QR code found. Please ensure the code is clear and well-lit.");
            setIsScanning(true); // Re-activate camera if no code found
          }
        } catch (err) {
          setErrorMSG("Error processing image.");
          console.error(err);
        }
        
        // Reset file input so the same file can be selected again
        e.target.value = '';
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let animationFrameId;

    const startCamera = async () => {
      if (!isScanning) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', true);
          videoRef.current.play().catch(e => console.warn("Video play interrupted:", e));
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setErrorMSG("Camera unavailable. You can still upload images from your device below.");
      }
    };

    const tick = () => {
      if (!isScanning) return;
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            setIsScanning(false);
            stopTracks();
            onScan(code.data);
            return;
          }
        } catch (err) {
          console.warn("Scan loop error:", err);
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isScanning) {
      startCamera();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      stopTracks();
    };
  }, [onScan, isScanning]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#111827', padding: 20, borderRadius: 16, width: '90%', maxWidth: 400, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: 16 }}>Scan QR Code</h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 24, cursor: 'pointer', lineHeight: 1
          }}>&times;</button>
        </div>

        {errorMSG ? (
          <div style={{ padding: 20, background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 14 }}>
            {errorMSG}
          </div>
        ) : (
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, background: '#000', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} style={{ width: '100%', height: 'auto', display: 'block' }} muted/>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {/* Visual Scanner Guide overlay */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 180, height: 180, border: '2px solid rgba(132, 204, 22, 0.5)', borderRadius: 12,
              boxShadow: '0 0 0 4000px rgba(0,0,0,0.4)', pointerEvents: 'none'
            }}></div>
          </div>
        )}
        
        <div style={{ textAlign: 'center', marginTop: 16, color: '#9ca3af', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span>Point camera at the batch label</span>
          
          <label style={{
            cursor: 'pointer', background: '#374151', padding: '8px 16px', borderRadius: 6, display: 'inline-block',
            color: 'white', fontWeight: 500, border: '1px solid #4b5563'
          }}>
            📁 Upload from Device
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    </div>
  );
}
