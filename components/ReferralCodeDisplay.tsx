'use client';

import React, { useState } from 'react';
import { Copy, Check, Share2, Users, Gift, MessageCircle } from 'lucide-react';

interface ReferralCodeDisplayProps {
  referralCode?: string;
  referralCount?: number;
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
}

export default function ReferralCodeDisplay({ 
  referralCode, 
  referralCount = 0, 
  className = '',
  showHeader = true,
  compact = false
}: ReferralCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  // Don't render if no referral code
  if (!referralCode) {
    return null;
  }

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy referral code:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareReferral = async () => {
    const shareUrl = `${window.location.origin}?ref=${referralCode}`;
    const shareText = `Hey! Check out MedWira for instant medicine photo scanning. Sign up using my referral link and get your first 30 scans free! ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join MedWira AI',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copy URL
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      // Fallback: copy referral URL to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const shareUrl = `${window.location.origin}?ref=${referralCode}`;
    const shareText = `Hey! Check out MedWira for instant medicine photo scanning. Sign up using my referral link and get your first 30 scans free! ${shareUrl}`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(shareText);
    
    // Create WhatsApp share URL
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp in new tab/window
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`referral-code-display ${compact ? 'compact' : ''} ${className}`}>
      {showHeader && (
        <div className="referral-header">
          <div className="referral-icon">
            <Gift size={16} />
          </div>
          <div className="referral-info">
            <h4>Your Referral Code</h4>
            <p>Share with friends to earn rewards</p>
          </div>
        </div>
      )}

      <div className="referral-code-container">
        <div className="referral-code-value">
          <code>{referralCode}</code>
        </div>
        <div className="referral-actions">
          <button
            onClick={handleCopyReferralCode}
            className={`copy-btn ${copied ? 'copied' : ''}`}
            title="Copy referral code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="whatsapp-btn"
            title="Share on WhatsApp"
          >
            <MessageCircle size={14} />
            WhatsApp
          </button>
          <button
            onClick={handleShareReferral}
            className="share-btn"
            title="Share referral"
          >
            <Share2 size={14} />
            Share
          </button>
        </div>
      </div>

      {referralCount > 0 && (
        <div className="referral-stats">
          <div className="referral-stat">
            <Users size={14} />
            <span>{referralCount} friend{referralCount !== 1 ? 's' : ''} referred</span>
          </div>
        </div>
      )}

      {!compact && (
        <div className="referral-benefits">
          <p className="referral-note">
            <strong>Earn rewards:</strong> Get tokens for each friend who signs up with your code!
          </p>
        </div>
      )}

      <style jsx>{`
        .referral-code-display {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 153, 204, 0.1));
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
        }

        .referral-code-display.compact {
          padding: 12px;
          margin: 8px 0;
        }

        .referral-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .referral-icon {
          background: rgba(0, 212, 255, 0.2);
          border-radius: 8px;
          padding: 8px;
          color: #00d4ff;
        }

        .referral-info h4 {
          margin: 0 0 4px 0;
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }

        .referral-info p {
          margin: 0;
          color: #ccc;
          font-size: 14px;
        }

        .referral-code-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .referral-code-value {
          flex: 1;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          padding: 12px;
        }

        .referral-code-value code {
          color: #00d4ff;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 2px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .referral-actions {
          display: flex;
          gap: 8px;
        }

        .copy-btn, .share-btn, .whatsapp-btn {
          background: rgba(0, 212, 255, 0.2);
          border: 1px solid rgba(0, 212, 255, 0.3);
          color: #00d4ff;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .copy-btn:hover, .share-btn:hover, .whatsapp-btn:hover {
          background: rgba(0, 212, 255, 0.3);
          border-color: rgba(0, 212, 255, 0.5);
          transform: translateY(-1px);
        }

        .copy-btn.copied {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .whatsapp-btn {
          background: rgba(37, 211, 102, 0.2);
          border-color: rgba(37, 211, 102, 0.3);
          color: #25d366;
        }

        .whatsapp-btn:hover {
          background: rgba(37, 211, 102, 0.3);
          border-color: rgba(37, 211, 102, 0.5);
        }

        .referral-stats {
          margin-bottom: 12px;
        }

        .referral-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #00d4ff;
          font-size: 14px;
          font-weight: 500;
        }

        .referral-benefits {
          border-top: 1px solid rgba(0, 212, 255, 0.2);
          padding-top: 12px;
        }

        .referral-note {
          margin: 0;
          color: #ccc;
          font-size: 13px;
          line-height: 1.4;
        }

        .referral-note strong {
          color: #00d4ff;
        }

        @media (max-width: 768px) {
          .referral-code-container {
            flex-direction: column;
            align-items: stretch;
          }

          .referral-actions {
            justify-content: center;
          }

          .copy-btn, .share-btn, .whatsapp-btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
