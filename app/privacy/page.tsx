'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[rgba(10,10,10,0.95)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.1)] z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          <div className="text-xl font-bold bg-gradient-to-r from-[#00d4ff] to-[#0099cc] bg-clip-text text-transparent">
            MedWira
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-gray-400">Last Updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-gray-300 leading-relaxed">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              Welcome to MedWira (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our medicine identification and analysis service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">2.1 Information You Provide</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Account information (email address, name) when you sign up via Google or Facebook OAuth</li>
                  <li>Medicine images you upload for identification and analysis</li>
                  <li>Allergy information you voluntarily provide</li>
                  <li>Communication data when you contact our support team</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">2.2 Automatically Collected Information</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Device information (type, operating system, browser)</li>
                  <li>Usage data (features used, time spent, interactions)</li>
                  <li>Log data (IP address, access times, pages viewed)</li>
                  <li>Cookie and tracking data for service improvement</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-3">We use the collected information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To provide and maintain our medicine identification service</li>
              <li>To analyze medicine images using AI and provide safety information</li>
              <li>To personalize your experience and improve our service</li>
              <li>To manage your account and process token transactions</li>
              <li>To send important updates, security alerts, and support messages</li>
              <li>To detect, prevent, and address technical issues or fraudulent activity</li>
              <li>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Storage and Security</h2>
            <div className="space-y-3">
              <p>
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encrypted data transmission using HTTPS/TLS protocols</li>
                <li>Secure cloud storage with Supabase (PostgreSQL database)</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication via OAuth 2.0</li>
                <li>Data backup and disaster recovery procedures</li>
              </ul>
              <p className="mt-3">
                While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Sharing and Disclosure</h2>
            <div className="space-y-3">
              <p>We do not sell your personal information. We may share your data in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Service Providers:</strong> Google (Gemini AI), Supabase (database), Stripe (payments)</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize data sharing</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights and Choices</h2>
            <p className="mb-3">You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent for data processing</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@medwira.com" className="text-[#00d4ff] hover:underline">
                privacy@medwira.com
              </a>
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Cookies and Tracking Technologies</h2>
            <p className="mb-3">
              We use cookies and similar technologies to enhance your experience:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Essential Cookies:</strong> Required for authentication and core functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand usage patterns and improve service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and language preferences</li>
            </ul>
            <p className="mt-3">
              You can control cookies through your browser settings, though this may affect functionality.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Children&apos;s Privacy</h2>
            <p>
              MedWira is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected data from a child, please contact us immediately.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries outside your residence. We ensure appropriate safeguards are in place to protect your data in compliance with applicable privacy laws.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date. Continued use of our service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Us</h2>
            <p className="mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 space-y-2">
              <p><strong>Email:</strong> <a href="mailto:privacy@medwira.com" className="text-[#00d4ff] hover:underline">privacy@medwira.com</a></p>
              <p><strong>Support:</strong> <a href="mailto:support@medwira.com" className="text-[#00d4ff] hover:underline">support@medwira.com</a></p>
              <p><strong>Website:</strong> <a href="https://medwira.com" className="text-[#00d4ff] hover:underline">https://medwira.com</a></p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.1)] bg-[rgba(10,10,10,0.95)] backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 MedWira. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/terms" className="text-gray-400 hover:text-[#00d4ff] transition-colors">
                Terms of Service
              </Link>
              <Link href="/terms-of-sale" className="text-gray-400 hover:text-[#00d4ff] transition-colors">
                Terms of Sale
              </Link>
              <a href="mailto:support@medwira.com" className="text-gray-400 hover:text-[#00d4ff] transition-colors flex items-center gap-1">
                <Mail size={14} />
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

