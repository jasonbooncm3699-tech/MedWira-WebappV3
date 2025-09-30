'use client';

import React, { useState } from 'react';
import { Camera, Download, X } from 'lucide-react';

interface ScreenshotButtonProps {
  className?: string;
}

export default function ScreenshotButton({ className = '' }: ScreenshotButtonProps) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string>('');

  const takeScreenshot = async () => {
    try {
      // Use html2canvas to capture the entire page
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0a0a0a',
        scale: 1,
        logging: false,
      });
      
      const dataURL = canvas.toDataURL('image/png', 0.9);
      setScreenshotData(dataURL);
      setShowScreenshot(true);
      
    } catch (error) {
      console.error('Screenshot error:', error);
      alert('Screenshot failed. Please try again.');
    }
  };

  const downloadScreenshot = () => {
    if (screenshotData) {
      const link = document.createElement('a');
      link.download = `medwira-screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.href = screenshotData;
      link.click();
    }
  };

  const closeScreenshot = () => {
    setShowScreenshot(false);
    setScreenshotData('');
  };

  return (
    <>
      <button
        onClick={takeScreenshot}
        className={`screenshot-btn ${className}`}
        title="Take Screenshot"
      >
        <Camera size={16} />
        Screenshot
      </button>

      {showScreenshot && (
        <div className="screenshot-modal-overlay" onClick={closeScreenshot}>
          <div className="screenshot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="screenshot-header">
              <h3>Screenshot Captured</h3>
              <button onClick={closeScreenshot} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="screenshot-preview">
              <img src={screenshotData} alt="Screenshot" />
            </div>
            
            <div className="screenshot-actions">
              <button onClick={downloadScreenshot} className="download-btn">
                <Download size={16} />
                Download
              </button>
              <button onClick={closeScreenshot} className="close-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
