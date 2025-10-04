'use client';

import React from 'react';

interface AIStatusDisplayProps {
  status: 'idle' | 'Analyzing Image...' | 'Extracting Text...' | 'Matching Database...' | 'Checking Information...' | 'Summarizing Output...';
  className?: string;
}

export default function AIStatusDisplay({ status, className = '' }: AIStatusDisplayProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div className={`ai-status-display ${className}`}>
      <div className="ai-status-content">
        <div className="typing-indicator">
          <div className="typing-dots">
            <span className="dot dot-1"></span>
            <span className="dot dot-2"></span>
            <span className="dot dot-3"></span>
          </div>
        </div>
        <div className="status-text">
          <span className="status-label">AI is</span>
          <span className="status-message">{status}</span>
        </div>
      </div>

      <style jsx>{`
        .ai-status-display {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 12px;
          margin: 8px 0;
          animation: slideInUp 0.3s ease-out;
        }

        .ai-status-content {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .typing-dots {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00d4ff;
          animation: typingAnimation 1.4s infinite ease-in-out;
        }

        .dot-1 {
          animation-delay: 0s;
        }

        .dot-2 {
          animation-delay: 0.2s;
        }

        .dot-3 {
          animation-delay: 0.4s;
        }

        .status-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .status-label {
          font-size: 12px;
          color: #00d4ff;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-message {
          font-size: 14px;
          color: #ffffff;
          font-weight: 500;
        }

        @keyframes typingAnimation {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .ai-status-display {
            padding: 10px 12px;
            margin: 6px 0;
          }

          .ai-status-content {
            gap: 8px;
          }

          .dot {
            width: 6px;
            height: 6px;
          }

          .status-label {
            font-size: 11px;
          }

          .status-message {
            font-size: 13px;
          }
        }

        /* Animation for status changes */
        .ai-status-display.status-changing {
          animation: statusChange 0.2s ease-in-out;
        }

        @keyframes statusChange {
          0% {
            opacity: 0.7;
            transform: scale(0.98);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
