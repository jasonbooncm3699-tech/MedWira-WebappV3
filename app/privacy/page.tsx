'use client';

import React from 'react';
import LegalPageLayout from '@/components/LegalPageLayout';

/**
 * Privacy Policy Page - Enhanced with Malaysian tech aesthetic
 * Design inspiration: Grab's clean layouts, Shopee's teal accents
 * WCAG AA compliant for accessibility
 */
export default function PrivacyPolicy() {
  const sections = [
    { id: 'introduction', title: 'Introduction' },
    { id: 'information-collection', title: 'Information We Collect' },
    { id: 'data-usage', title: 'How We Use Your Information' },
    { id: 'data-security', title: 'Data Storage & Security' },
    { id: 'data-sharing', title: 'Data Sharing & Disclosure' },
    { id: 'user-rights', title: 'Your Rights & Choices' },
    { id: 'cookies', title: 'Cookies & Tracking' },
    { id: 'children', title: 'Children\'s Privacy' },
    { id: 'international', title: 'International Transfers' },
    { id: 'changes', title: 'Policy Changes' },
    { id: 'contact', title: 'Contact Us' },
  ];

  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="October 1, 2025"
      sections={sections}
      currentPage="privacy"
    >
      {/* Section 1: Introduction */}
      <section id="introduction" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Introduction
        </h2>
        <p className="text-[#CBD5E0] leading-relaxed mb-4">
          Welcome to <strong className="text-white">MedWira</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our medicine identification and analysis service.
        </p>
        <div className="bg-[#4FD1C5]/10 border-l-4 border-[#4FD1C5] p-4 rounded-r-lg">
          <p className="text-[#4FD1C5] text-sm italic">
            <strong>Note:</strong> Your privacy matters to us. We follow industry best practices and comply with Malaysian PDPA and international data protection standards.
          </p>
        </div>
      </section>

      {/* Section 2: Information Collection */}
      <section id="information-collection" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Information We Collect
        </h2>
        
        <div className="mb-6">
          <h3 className="text-xl font-medium text-[#81E6D9] mb-3">Information You Provide</h3>
          <ul className="space-y-2 ml-6">
            <li className="text-[#CBD5E0] flex items-start gap-2">
              <span className="text-[#4FD1C5] mt-1">•</span>
              <span><strong className="text-white">Account Information:</strong> Email address and name when you sign up via Google or Facebook OAuth</span>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-2">
              <span className="text-[#4FD1C5] mt-1">•</span>
              <span><strong className="text-white">Medicine Images:</strong> Photos you upload for identification and analysis</span>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-2">
              <span className="text-[#4FD1C5] mt-1">•</span>
              <span><strong className="text-white">Allergy Information:</strong> Voluntary health data you provide for safety checks</span>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-2">
              <span className="text-[#4FD1C5] mt-1">•</span>
              <span><strong className="text-white">Communications:</strong> Messages when you contact our support team</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-medium text-[#81E6D9] mb-3">Automatically Collected Information</h3>
          <ul className="space-y-2 ml-6">
            <li className="text-[#CBD5E0] flex items-start gap-2">
              <span className="text-[#4FD1C5] mt-1">•</span>
              <span><strong className="text-white">Device Data:</strong> Type, operating system, and browser information</span>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-2">
              <span className="text-[#4FD1C5] mt-1">•</span>
              <span><strong className="text-white">Usage Analytics:</strong> Features used, time spent, and interaction patterns</span>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-2">
              <span className="text-[#4FD1C5] mt-1">•</span>
              <span><strong className="text-white">Log Data:</strong> IP address, access times, and pages viewed</span>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-2">
              <span className="text-[#4FD1C5] mt-1">•</span>
              <span><strong className="text-white">Cookies:</strong> Tracking data for service improvement and personalization</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3: Data Usage */}
      <section id="data-usage" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          How We Use Your Information
        </h2>
        <p className="text-[#CBD5E0] mb-4">We use the collected information for the following purposes:</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#2D3748] p-4 rounded-lg border border-[#4A5568]">
            <h4 className="text-white font-medium mb-2">Core Services</h4>
            <ul className="space-y-1 text-sm text-[#CBD5E0]">
              <li>• Provide medicine identification</li>
              <li>• Analyze medicine images with AI</li>
              <li>• Deliver safety information</li>
            </ul>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg border border-[#4A5568]">
            <h4 className="text-white font-medium mb-2">Account Management</h4>
            <ul className="space-y-1 text-sm text-[#CBD5E0]">
              <li>• Manage your account</li>
              <li>• Process token transactions</li>
              <li>• Handle referrals and rewards</li>
            </ul>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg border border-[#4A5568]">
            <h4 className="text-white font-medium mb-2">Improvement</h4>
            <ul className="space-y-1 text-sm text-[#CBD5E0]">
              <li>• Personalize your experience</li>
              <li>• Improve our AI models</li>
              <li>• Analyze usage patterns</li>
            </ul>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg border border-[#4A5568]">
            <h4 className="text-white font-medium mb-2">Communication</h4>
            <ul className="space-y-1 text-sm text-[#CBD5E0]">
              <li>• Send updates and alerts</li>
              <li>• Provide customer support</li>
              <li>• Security notifications</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4: Data Security */}
      <section id="data-security" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Data Storage & Security
        </h2>
        <p className="text-[#CBD5E0] mb-4">
          We implement industry-standard security measures to protect your personal information:
        </p>
        <div className="bg-gradient-to-r from-[#4FD1C5]/10 to-transparent p-6 rounded-lg border border-[#4FD1C5]/30">
          <ul className="space-y-3">
            <li className="text-[#CBD5E0] flex items-start gap-3">
              <span className="text-[#4FD1C5] text-2xl">🔒</span>
              <div>
                <strong className="text-white">Encrypted Transmission:</strong> HTTPS/TLS protocols for all data transfers
              </div>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-3">
              <span className="text-[#4FD1C5] text-2xl">☁️</span>
              <div>
                <strong className="text-white">Secure Cloud Storage:</strong> Supabase (PostgreSQL) with enterprise-grade security
              </div>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-3">
              <span className="text-[#4FD1C5] text-2xl">🛡️</span>
              <div>
                <strong className="text-white">OAuth 2.0 Authentication:</strong> No password storage, secure social login
              </div>
            </li>
            <li className="text-[#CBD5E0] flex items-start gap-3">
              <span className="text-[#4FD1C5] text-2xl">🔄</span>
              <div>
                <strong className="text-white">Regular Audits:</strong> Security assessments and vulnerability testing
              </div>
            </li>
          </ul>
        </div>
        <p className="text-[#A0AEC0] text-sm mt-4 italic">
          While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
        </p>
      </section>

      {/* Section 5: Data Sharing */}
      <section id="data-sharing" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Data Sharing & Disclosure
        </h2>
        <div className="bg-[#2D3748] p-6 rounded-lg border border-[#4A5568] mb-4">
          <p className="text-[#4FD1C5] font-semibold mb-2">We do NOT sell your personal information.</p>
          <p className="text-[#CBD5E0] text-sm">Your privacy is our priority. We only share data in specific circumstances outlined below.</p>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium mb-2">🤝 Service Providers</h4>
            <p className="text-[#CBD5E0] text-sm">Google (Gemini AI), Supabase (database), Stripe (payments)</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">⚖️ Legal Requirements</h4>
            <p className="text-[#CBD5E0] text-sm">When required by law, court order, or government request</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">🔄 Business Transfers</h4>
            <p className="text-[#CBD5E0] text-sm">In case of merger, acquisition, or asset sale</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">✅ With Your Consent</h4>
            <p className="text-[#CBD5E0] text-sm">When you explicitly authorize data sharing</p>
          </div>
        </div>
      </section>

      {/* Section 6: User Rights */}
      <section id="user-rights" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Your Rights & Choices
        </h2>
        <p className="text-[#CBD5E0] mb-4">You have the following rights regarding your personal information:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: '👁️', title: 'Access', desc: 'Request a copy of your data' },
            { icon: '✏️', title: 'Correction', desc: 'Update inaccurate information' },
            { icon: '🗑️', title: 'Deletion', desc: 'Request account and data removal' },
            { icon: '📦', title: 'Portability', desc: 'Receive data in portable format' },
            { icon: '🚫', title: 'Opt-out', desc: 'Unsubscribe from marketing' },
            { icon: '⏸️', title: 'Withdraw', desc: 'Revoke consent for processing' },
          ].map((right, index) => (
            <div key={index} className="bg-[#2D3748] p-4 rounded-lg border border-[#4A5568] hover:border-[#4FD1C5] transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{right.icon}</span>
                <div>
                  <h4 className="text-white font-medium">{right.title}</h4>
                  <p className="text-[#CBD5E0] text-sm">{right.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[#CBD5E0] mt-4">
          To exercise these rights, contact us at{' '}
          <a href="mailto:privacy@medwira.com" className="text-[#4FD1C5] hover:underline font-medium">
            privacy@medwira.com
          </a>
        </p>
      </section>

      {/* Section 7: Cookies */}
      <section id="cookies" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Cookies & Tracking Technologies
        </h2>
        <p className="text-[#CBD5E0] mb-4">We use cookies and similar technologies to enhance your experience:</p>
        <div className="space-y-3">
          <div className="bg-[#2D3748] p-4 rounded-lg border-l-4 border-[#4FD1C5]">
            <h4 className="text-white font-medium mb-1">🍪 Essential Cookies</h4>
            <p className="text-[#CBD5E0] text-sm">Required for authentication and core functionality</p>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg border-l-4 border-[#81E6D9]">
            <h4 className="text-white font-medium mb-1">📊 Analytics Cookies</h4>
            <p className="text-[#CBD5E0] text-sm">Help us understand usage patterns and improve service</p>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg border-l-4 border-[#38B2AC]">
            <h4 className="text-white font-medium mb-1">⚙️ Preference Cookies</h4>
            <p className="text-[#CBD5E0] text-sm">Remember your settings and language preferences</p>
          </div>
        </div>
        <p className="text-[#A0AEC0] text-sm mt-3">
          You can control cookies through your browser settings, though this may affect functionality.
        </p>
      </section>

      {/* Section 8: Children */}
      <section id="children" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Children&apos;s Privacy
        </h2>
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg">
          <p className="text-yellow-200">
            <strong>Age Restriction:</strong> MedWira is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected data from a child, please contact us immediately.
          </p>
        </div>
      </section>

      {/* Section 9: International */}
      <section id="international" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          International Data Transfers
        </h2>
        <p className="text-[#CBD5E0]">
          Your information may be transferred to and processed in countries outside your residence. We ensure appropriate safeguards are in place to protect your data in compliance with applicable privacy laws including Malaysian PDPA and GDPR.
        </p>
      </section>

      {/* Section 10: Changes */}
      <section id="changes" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Changes to This Privacy Policy
        </h2>
        <p className="text-[#CBD5E0]">
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date. Continued use of our service after changes constitutes acceptance of the updated policy.
        </p>
      </section>

      {/* Section 11: Contact */}
      <section id="contact" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Contact Us
        </h2>
        <p className="text-[#CBD5E0] mb-4">
          If you have questions, concerns, or requests regarding this Privacy Policy or our data practices:
        </p>
        <div className="bg-gradient-to-r from-[#2D3748] to-[#1A202C] p-6 rounded-lg border border-[#4A5568]">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[#A0AEC0] text-sm mb-1">Privacy Inquiries</p>
              <a href="mailto:privacy@medwira.com" className="text-[#4FD1C5] hover:underline font-medium">
                privacy@medwira.com
              </a>
            </div>
            <div>
              <p className="text-[#A0AEC0] text-sm mb-1">General Support</p>
              <a href="mailto:support@medwira.com" className="text-[#4FD1C5] hover:underline font-medium">
                support@medwira.com
              </a>
            </div>
            <div>
              <p className="text-[#A0AEC0] text-sm mb-1">Website</p>
              <a href="https://medwira.com" className="text-[#4FD1C5] hover:underline font-medium">
                medwira.com
              </a>
            </div>
            <div>
              <p className="text-[#A0AEC0] text-sm mb-1">Response Time</p>
              <p className="text-white font-medium">Within 5 business days</p>
            </div>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
