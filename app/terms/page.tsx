'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="text-gray-400">Last Updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-gray-300 leading-relaxed">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using MedWira (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and MedWira.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="mb-3">
              MedWira is an AI-powered medicine identification and analysis platform that provides:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Medicine identification through image recognition</li>
              <li>Detailed drug information, interactions, and safety warnings</li>
              <li>Allergy checking and contraindication alerts</li>
              <li>Multi-language support for Southeast Asian languages</li>
              <li>Token-based usage system with free and paid tiers</li>
            </ul>
            <p className="mt-3 font-semibold text-[#00d4ff]">
              Important: MedWira is an informational tool and does NOT replace professional medical advice, diagnosis, or treatment.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Medical Disclaimer</h2>
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 space-y-3">
              <p className="font-semibold text-red-400">⚠️ IMPORTANT MEDICAL DISCLAIMER</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>MedWira is NOT a substitute for professional medical advice, diagnosis, or treatment</li>
                <li>Always consult qualified healthcare professionals for medical decisions</li>
                <li>In case of emergency, call your local emergency services immediately</li>
                <li>AI-generated information may contain errors or inaccuracies</li>
                <li>Do not rely solely on MedWira for medication decisions</li>
                <li>Information is for educational purposes only</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. User Accounts and Authentication</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">4.1 Account Creation</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You must sign in using Google or Facebook OAuth</li>
                  <li>You must provide accurate and complete information</li>
                  <li>You are responsible for maintaining account security</li>
                  <li>You must be at least 13 years old to use the Service</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">4.2 Account Responsibilities</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Keep your OAuth credentials secure and confidential</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>You are liable for all activities under your account</li>
                  <li>One account per user (no multiple accounts)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Token System and Usage</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">5.1 Free Tier</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>New users receive 30 free tokens upon signup</li>
                  <li>Each medicine scan consumes 1 token</li>
                  <li>Referral rewards: 30 tokens per successful referral</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">5.2 Token Purchases</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Starter Pack: RM19.90 for 50 tokens</li>
                  <li>Standard Pack: RM49.90 for 200 tokens</li>
                  <li>Premium Pack: RM99.90 for 500 tokens</li>
                  <li>Tokens are non-refundable and non-transferable</li>
                  <li>Tokens do not expire but account closure forfeits remaining tokens</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Acceptable Use Policy</h2>
            <p className="mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the Service for illegal purposes or unauthorized medical practice</li>
              <li>Upload inappropriate, offensive, or harmful content</li>
              <li>Attempt to reverse engineer, hack, or compromise the Service</li>
              <li>Create automated bots or scrapers to access the Service</li>
              <li>Share, resell, or transfer your account or tokens</li>
              <li>Misrepresent yourself or impersonate others</li>
              <li>Interfere with other users&apos; access to the Service</li>
              <li>Upload viruses, malware, or malicious code</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property Rights</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">7.1 Our Content</h3>
                <p>
                  All content, features, and functionality of MedWira (including but not limited to text, graphics, logos, code, AI models, and algorithms) are owned by MedWira and protected by intellectual property laws.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">7.2 Your Content</h3>
                <p>
                  You retain ownership of images you upload. By uploading, you grant us a license to process, analyze, and store images to provide the Service. We may use anonymized data for service improvement.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 space-y-3">
              <p className="font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>MedWira is provided &quot;AS IS&quot; without warranties of any kind</li>
                <li>We are NOT liable for medical decisions made using our Service</li>
                <li>We are NOT liable for AI errors, inaccuracies, or omissions</li>
                <li>We are NOT liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability shall not exceed the amount you paid in the last 12 months</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Indemnification</h2>
            <p>
              You agree to indemnify and hold MedWira harmless from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Service, violation of these Terms, or infringement of any rights.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Service Modifications and Termination</h2>
            <div className="space-y-3">
              <p>
                We reserve the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modify, suspend, or discontinue the Service at any time</li>
                <li>Change pricing, token allocations, or features with notice</li>
                <li>Terminate or suspend accounts for Terms violations</li>
                <li>Remove content that violates our policies</li>
              </ul>
              <p className="mt-3">
                You may terminate your account at any time by contacting support. Termination does not entitle you to token refunds.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Dispute Resolution</h2>
            <div className="space-y-3">
              <p>
                Any disputes shall be resolved through:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Good faith negotiation between parties</li>
                <li>Mediation if negotiation fails</li>
                <li>Arbitration in accordance with local laws</li>
              </ol>
              <p className="mt-3">
                These Terms are governed by the laws of Malaysia, excluding conflict of law provisions.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be notified via email or Service notification. Continued use after changes constitutes acceptance of updated Terms.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Contact Information</h2>
            <p className="mb-4">
              For questions, concerns, or support regarding these Terms:
            </p>
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 space-y-2">
              <p><strong>Email:</strong> <a href="mailto:legal@medwira.com" className="text-[#00d4ff] hover:underline">legal@medwira.com</a></p>
              <p><strong>Support:</strong> <a href="mailto:support@medwira.com" className="text-[#00d4ff] hover:underline">support@medwira.com</a></p>
              <p><strong>Website:</strong> <a href="https://medwira.com" className="text-[#00d4ff] hover:underline">https://medwira.com</a></p>
            </div>
          </section>

          {/* Acceptance */}
          <section className="bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-lg p-6">
            <p className="font-semibold text-[#00d4ff] mb-2">
              BY USING MEDWIRA, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
            </p>
            <p className="text-sm text-gray-400">
              If you do not agree to these Terms, you must immediately cease using the Service.
            </p>
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
              <Link href="/privacy" className="text-gray-400 hover:text-[#00d4ff] transition-colors">
                Privacy Policy
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

