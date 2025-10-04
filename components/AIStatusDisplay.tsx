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
        <div className="ai-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15.2C13.7673 15.2 15.2 13.7673 15.2 12C15.2 10.2327 13.7673 8.8 12 8.8C10.2327 8.8 8.8 10.2327 8.8 12C8.8 13.7673 10.2327 15.2 12 15.2Z" fill="currentColor"/>
            <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="currentColor"/>
          </svg>
        </div>
        <div className="status-text">
          <span className="status-message">{status}</span>
        </div>
        <div className="typing-indicator">
          <div className="typing-dots">
            <span className="dot dot-1"></span>
            <span className="dot dot-2"></span>
            <span className="dot dot-3"></span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ai-status-display {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          margin: 8px 0;
          animation: slideInUp 0.3s ease-out;
        }

        .ai-status-content {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .ai-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          opacity: 0.8;
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
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.7;
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
          align-items: center;
          flex: 1;
        }

        .status-message {
          font-size: 13px;
          color: #ffffff;
          font-weight: 400;
          line-height: 1.3;
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
            width: 4px;
            height: 4px;
          }

          .status-message {
            font-size: 12px;
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
