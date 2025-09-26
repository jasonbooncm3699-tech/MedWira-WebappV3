import React, { useState } from 'react';

export default function Home() {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        }
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
    } catch (error) {
      alert('Camera access failed: ' + (error as Error).message);
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
    <div>
      <h1>MedWira AI</h1>
      <p>Medicine identification platform</p>
      
      <button onClick={handleCameraCapture}>
        Open Camera
      </button>

      {showCamera && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'black', zIndex: 1000 }}>
          <button onClick={closeCamera} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1001, background: 'red', color: 'white', border: 'none', padding: '10px' }}>
            Close
          </button>
          <video
            ref={(el) => {
              if (el && cameraStream) {
                el.srcObject = cameraStream;
              }
            }}
            autoPlay
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
    </div>
  );
}