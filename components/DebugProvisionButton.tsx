'use client';

import React, { useState } from 'react';
import { Wrench, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DebugProvisionButtonProps {
  className?: string;
}

export default function DebugProvisionButton({ className = '' }: DebugProvisionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    action: string;
    profile?: any;
  } | null>(null);

  const handleDebugProvision = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔧 Starting debug provision user...');
      
      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ No active session found:', sessionError);
        setResult({
          success: false,
          message: 'No active session found. Please log in first.',
          action: 'error'
        });
        return;
      }

      console.log('✅ Active session found, calling debug endpoint...');
      
      // Call the debug provision endpoint
      const response = await fetch('/api/debug-provision-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📊 Debug provision response:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult({
        success: data.success,
        message: data.message,
        action: data.action,
        profile: data.profile
      });

    } catch (error) {
      console.error('❌ Error calling debug provision endpoint:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        action: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`debug-provision-container ${className}`}>
      <button
        onClick={handleDebugProvision}
        disabled={isLoading}
        className="debug-provision-btn"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Checking Profile...
          </>
        ) : (
          <>
            <Wrench size={16} />
            Debug Provision User
          </>
        )}
      </button>

      {result && (
        <div className={`debug-result ${result.success ? 'success' : 'error'}`}>
          <div className="result-icon">
            {result.success ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
          </div>
          <div className="result-content">
            <div className="result-message">{result.message}</div>
            <div className="result-action">Action: {result.action}</div>
            {result.profile && (
              <div className="result-profile">
                <div className="profile-detail">
                  <strong>User ID:</strong> {result.profile.id}
                </div>
                <div className="profile-detail">
                  <strong>Tokens:</strong> {result.profile.token_count}
                </div>
                <div className="profile-detail">
                  <strong>Referral Code:</strong> {result.profile.referral_code || 'None'}
                </div>
                <div className="profile-detail">
                  <strong>Referral Count:</strong> {result.profile.referral_count}
                </div>
                {result.profile.created_at && (
                  <div className="profile-detail">
                    <strong>Created:</strong> {new Date(result.profile.created_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .debug-provision-container {
          margin: 16px 0;
          padding: 16px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .debug-provision-btn {
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .debug-provision-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #e55a2b, #e0841a);
          transform: translateY(-1px);
        }

        .debug-provision-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .debug-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 8px;
          display: flex;
          gap: 12px;
        }

        .debug-result.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .debug-result.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .result-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .debug-result.success .result-icon {
          color: #22c55e;
        }

        .debug-result.error .result-icon {
          color: #ef4444;
        }

        .result-content {
          flex: 1;
        }

        .result-message {
          font-weight: 500;
          margin-bottom: 8px;
        }

        .result-action {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 12px;
        }

        .result-profile {
          background: rgba(0, 0, 0, 0.2);
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .profile-detail {
          margin-bottom: 4px;
        }

        .profile-detail:last-child {
          margin-bottom: 0;
        }

        .profile-detail strong {
          color: #00d4ff;
        }

        @media (max-width: 768px) {
          .debug-provision-container {
            margin: 12px 0;
            padding: 12px;
          }

          .debug-provision-btn {
            padding: 10px 16px;
            font-size: 13px;
          }

          .debug-result {
            flex-direction: column;
            gap: 8px;
          }

          .result-profile {
            padding: 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

// Import supabase client for session management
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
