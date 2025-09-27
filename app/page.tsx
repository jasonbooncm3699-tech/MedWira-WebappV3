'use client';

import React, { useState } from 'react';
import { Camera } from 'lucide-react';

export default function Home() {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const handleCameraCapture = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera not supported. Please use HTTPS or a modern browser.');
        return;
      }

      // Check if we're on HTTPS or localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        alert('Camera requires HTTPS. Please access via https://localhost:3000');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' } // Force back camera
        }
      });

      setCameraStream(stream);
      setShowCamera(true);

    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera access failed: ' + (error as Error).message + '\n\nTry:\n1. Allow camera permission\n2. Use HTTPS (https://localhost:3000)\n3. Use a modern browser');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0a0a0a',
      color: 'white'
    }}>
      {/* Simple Camera Button */}
      <button 
        onClick={handleCameraCapture}
        style={{
          padding: '20px 40px',
          fontSize: '18px',
          background: '#00d4ff',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)'
        }}
      >
        <Camera size={24} />
        Open Camera
      </button>

      {/* Camera Modal */}
      {showCamera && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'black', 
          zIndex: 1000 
        }}>
          <button 
            onClick={closeCamera} 
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              zIndex: 1001, 
              background: 'red', 
              color: 'white', 
              border: 'none', 
              padding: '10px', 
              borderRadius: '8px' 
            }}
          >
            Close
          </button>
          <video
            ref={(el) => {
              if (el && cameraStream) {
                el.srcObject = cameraStream;
              }
            }}
            autoPlay
            playsInline
            style={{ 
              width: '100%', 
              height: '100%'
            }}
          />
          <p style={{ 
            position: 'absolute', 
            bottom: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            color: 'white', 
            textAlign: 'center', 
            background: 'rgba(0,0,0,0.7)', 
            padding: '10px', 
            borderRadius: '8px' 
          }}>
            Camera Test - Fresh deployment v4
          </p>
        </div>
      )}
    </div>
  );
}