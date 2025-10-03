'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface CompactReferralButtonProps {
  referralCode?: string;
  className?: string;
}

export default function CompactReferralButton({ 
  referralCode, 
  className = '' 
}: CompactReferralButtonProps) {
  const [copied, setCopied] = useState(false);

  // Don't render if no referral code
  if (!referralCode) {
    return null;
  }

  const handleCopyReferralCode = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent share action
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

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent copy action
    const shareUrl = `${window.location.origin}?ref=${referralCode}`;
    const shareText = `🔬 *MedWira AI - Instant Medicine Scanner* 🔬

Hey! I found this amazing AI-powered medicine scanner that can instantly identify any medicine just by taking a photo!

✨ *What you get:*
• 30 FREE scans when you sign up
• Instant medicine identification
• Detailed drug information & interactions
• Support for multiple languages

📱 *Sign up now:* ${shareUrl}

Use my referral code: *${referralCode}*

Perfect for healthcare professionals, students, and anyone who needs quick medicine information! 🏥💊`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(shareText);
    
    // Create WhatsApp share URL
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp in new tab/window
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`compact-referral-button ${className}`}>
      <button 
        className="referral-code-btn"
        onClick={handleCopyReferralCode}
        title={`Copy referral code: ${referralCode}`}
      >
        <span className="referral-code-text">{referralCode}</span>
        <button 
          className="share-icon-btn"
          onClick={handleWhatsAppShare}
          title="Share on WhatsApp"
        >
          <Share2 size={14} />
        </button>
      </button>

      <style jsx>{`
        .compact-referral-button {
          width: 100%;
          margin: 10px 0;
        }

        .referral-code-btn {
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          position: relative;
        }

        .referral-code-btn:hover {
          background: linear-gradient(135deg, #0099cc, #0077aa);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4);
        }

        .referral-code-text {
          flex: 1;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          text-align: left;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          letter-spacing: 1px;
          max-width: calc(100% - 30px); /* Leave space for share icon */
        }

        .share-icon-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
          width: 24px;
          height: 24px;
        }

        .share-icon-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .share-icon-btn:active {
          transform: scale(0.95);
        }

        /* Copy feedback */
        .referral-code-btn.copied {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }

        .referral-code-btn.copied .referral-code-text::after {
          content: ' ✓';
          color: #ffffff;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .referral-code-btn {
            padding: 10px 16px;
            font-size: 13px;
          }
          
          .referral-code-text {
            font-size: 12px;
            max-width: calc(100% - 28px);
          }
          
          .share-icon-btn {
            width: 22px;
            height: 22px;
          }
        }
      `}</style>
    </div>
  );
}
