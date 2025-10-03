'use client';

import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { getInitials, generateAvatarColor } from '@/lib/avatar-utils';
import ReferralCodeDisplay from './ReferralCodeDisplay';
import { User, Coins, Crown, RefreshCw } from 'lucide-react';

interface UserProfileProps {
  className?: string;
  showReferralCode?: boolean;
  showTokenBalance?: boolean;
  compact?: boolean;
}

export default function UserProfile({ 
  className = '',
  showReferralCode = true,
  showTokenBalance = true,
  compact = false
}: UserProfileProps) {
  const { user, isLoading, refreshUserData } = useAuth();

  if (isLoading) {
    return (
      <div className={`user-profile loading ${className}`}>
        <div className="loading-skeleton">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-info">
            <div className="skeleton-name"></div>
            <div className="skeleton-email"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleRefreshData = async () => {
    await refreshUserData();
  };

  return (
    <div className={`user-profile ${compact ? 'compact' : ''} ${className}`}>
      <div className="profile-header">
        <div className="user-avatar">
          {user.avatar_url && user.avatar_url.trim() !== '' ? (
            <Image 
              src={user.avatar_url} 
              alt={user.display_name || user.name || user.email} 
              className="avatar-image"
              width={32}
              height={32}
            />
          ) : (
            <div 
              className="avatar-initials"
              style={{ 
                backgroundColor: generateAvatarColor(user.display_name || user.name || user.email),
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                minWidth: '32px',
                minHeight: '32px'
              }}
            >
              {getInitials(user.name || user.display_name || user.email)}
            </div>
          )}
        </div>
        <div className="user-info">
          <h3 className="user-name">{user.name || user.display_name || 'User'}</h3>
          <p className="user-email">{user.email}</p>
        </div>
        <button 
          onClick={handleRefreshData}
          className="refresh-btn"
          title="Refresh user data"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {showTokenBalance && (
        <div className="token-balance">
          <div className="token-icon">
            <Coins size={16} />
          </div>
          <div className="token-info">
            <span className="token-count">{user.tokens}</span>
            <span className="token-label">tokens</span>
          </div>
          <div className="subscription-tier">
            <Crown size={14} />
            <span className="tier-name">{user.subscription_tier}</span>
          </div>
        </div>
      )}

      {showReferralCode && user.referral_code && (
        <ReferralCodeDisplay
          referralCode={user.referral_code}
          referralCount={user.referral_count}
          compact={compact}
          showHeader={!compact}
        />
      )}

      <style jsx>{`
        .user-profile {
          background: linear-gradient(135deg, rgba(0, 163, 181, 0.1), rgba(0, 123, 141, 0.1));
          border: 1px solid rgba(0, 163, 181, 0.3);
          border-radius: 16px;
          padding: 20px;
          margin: 16px 0;
        }

        .user-profile.compact {
          padding: 16px;
          margin: 8px 0;
        }

        .user-profile.loading {
          background: rgba(0, 0, 0, 0.1);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .loading-skeleton {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .skeleton-avatar {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .skeleton-info {
          flex: 1;
        }

        .skeleton-name {
          height: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          margin-bottom: 8px;
          width: 60%;
          animation: pulse 2s infinite;
        }

        .skeleton-email {
          height: 14px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          width: 80%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .user-avatar {
          background: rgba(0, 163, 181, 0.2);
          border-radius: 50%;
          padding: 12px;
          color: #00a3b5;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          overflow: hidden;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          margin: 0 0 4px 0;
          color: #ffffff;
          font-size: 18px;
          font-weight: 600;
        }

        .user-email {
          margin: 0;
          color: #ccc;
          font-size: 14px;
        }

        .refresh-btn {
          background: rgba(0, 163, 181, 0.2);
          border: 1px solid rgba(0, 163, 181, 0.3);
          color: #00a3b5;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .refresh-btn:hover {
          background: rgba(0, 163, 181, 0.3);
          border-color: rgba(0, 163, 181, 0.5);
          transform: translateY(-1px);
        }

        .token-balance {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 163, 181, 0.3);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .token-icon {
          background: rgba(255, 193, 7, 0.2);
          border-radius: 8px;
          padding: 8px;
          color: #ffc107;
        }

        .token-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .token-count {
          color: #ffc107;
          font-size: 20px;
          font-weight: 700;
        }

        .token-label {
          color: #ccc;
          font-size: 14px;
        }

        .subscription-tier {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 163, 181, 0.2);
          border-radius: 8px;
          padding: 6px 10px;
        }

        .tier-name {
          color: #00a3b5;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        @media (max-width: 768px) {
          .user-profile {
            padding: 16px;
          }

          .profile-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .user-info {
            width: 100%;
          }

          .refresh-btn {
            align-self: flex-end;
          }

          .token-balance {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .token-info {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
