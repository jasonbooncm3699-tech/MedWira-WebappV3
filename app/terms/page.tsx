'use client';

import React from 'react';
import LegalPageLayout from '@/components/LegalPageLayout';

/**
 * Terms of Service Page - Enhanced Malaysian tech design
 * Prominent medical disclaimer with visual alerts
 * Clear token system explanation and user responsibilities
 */
export default function TermsOfService() {
  const sections = [
    { id: 'acceptance', title: 'Acceptance of Terms' },
    { id: 'service', title: 'Description of Service' },
    { id: 'medical-disclaimer', title: 'Medical Disclaimer' },
    { id: 'accounts', title: 'User Accounts & OAuth' },
    { id: 'tokens', title: 'Token System & Usage' },
    { id: 'acceptable-use', title: 'Acceptable Use Policy' },
    { id: 'intellectual-property', title: 'Intellectual Property' },
    { id: 'liability', title: 'Limitation of Liability' },
    { id: 'indemnification', title: 'Indemnification' },
    { id: 'modifications', title: 'Service Modifications' },
    { id: 'disputes', title: 'Dispute Resolution' },
    { id: 'changes', title: 'Changes to Terms' },
    { id: 'contact', title: 'Contact Information' },
  ];

  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="October 1, 2025"
      sections={sections}
      currentPage="terms"
    >
      {/* Section 1: Acceptance */}
      <section id="acceptance" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Acceptance of Terms
        </h2>
        <p className="text-[#CBD5E0] leading-relaxed">
          By accessing or using <strong className="text-white">MedWira</strong> (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and MedWira.
        </p>
      </section>

      {/* Section 2: Service Description */}
      <section id="service" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Description of Service
        </h2>
        <p className="text-[#CBD5E0] mb-4">
          MedWira is an AI-powered medicine identification and analysis platform that provides:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-[#4FD1C5]/20 to-transparent p-4 rounded-lg border border-[#4FD1C5]/30">
            <div className="text-3xl mb-2">🔍</div>
            <h4 className="text-white font-medium mb-1">Medicine Identification</h4>
            <p className="text-[#CBD5E0] text-sm">Image recognition technology</p>
          </div>
          <div className="bg-gradient-to-br from-[#4FD1C5]/20 to-transparent p-4 rounded-lg border border-[#4FD1C5]/30">
            <div className="text-3xl mb-2">📋</div>
            <h4 className="text-white font-medium mb-1">Drug Information</h4>
            <p className="text-[#CBD5E0] text-sm">Interactions & safety warnings</p>
          </div>
          <div className="bg-gradient-to-br from-[#4FD1C5]/20 to-transparent p-4 rounded-lg border border-[#4FD1C5]/30">
            <div className="text-3xl mb-2">⚠️</div>
            <h4 className="text-white font-medium mb-1">Allergy Checking</h4>
            <p className="text-[#CBD5E0] text-sm">Contraindication alerts</p>
          </div>
          <div className="bg-gradient-to-br from-[#4FD1C5]/20 to-transparent p-4 rounded-lg border border-[#4FD1C5]/30">
            <div className="text-3xl mb-2">🌏</div>
            <h4 className="text-white font-medium mb-1">Multi-language</h4>
            <p className="text-[#CBD5E0] text-sm">10 SEA languages supported</p>
          </div>
        </div>
      </section>

      {/* Section 3: Medical Disclaimer - PROMINENT */}
      <section id="medical-disclaimer" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-red-500 rounded-full animate-pulse"></span>
          Medical Disclaimer
        </h2>
        <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 border-2 border-red-500/50 rounded-xl p-6 shadow-lg shadow-red-500/20">
          <div className="flex items-start gap-4">
            <div className="text-5xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-red-400 font-bold text-xl mb-3">IMPORTANT MEDICAL DISCLAIMER</h3>
              <ul className="space-y-2 text-[#F7FAFC]">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>MedWira is <strong className="text-red-300">NOT</strong> a substitute for professional medical advice, diagnosis, or treatment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span><strong className="text-red-300">Always consult</strong> qualified healthcare professionals for medical decisions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>In case of emergency, <strong className="text-red-300">call local emergency services immediately</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>AI-generated information may contain <strong className="text-red-300">errors or inaccuracies</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Do <strong className="text-red-300">NOT</strong> rely solely on MedWira for medication decisions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>Information is for <strong className="text-red-300">educational purposes only</strong></span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-red-950/50 rounded-lg border border-red-500/30">
                <p className="text-red-200 text-sm font-medium">
                  🏥 Emergency Numbers: Malaysia 999 | Singapore 995 | Indonesia 119 | Thailand 1669
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: User Accounts */}
      <section id="accounts" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          User Accounts & Authentication
        </h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-medium text-[#81E6D9] mb-3">Account Creation</h3>
            <div className="bg-[#2D3748] p-4 rounded-lg border border-[#4A5568]">
              <ul className="space-y-2">
                <li className="text-[#CBD5E0] flex items-center gap-2">
                  <span className="text-[#4FD1C5]">✓</span>
                  Sign in using <strong className="text-white">Google or Facebook OAuth</strong>
                </li>
                <li className="text-[#CBD5E0] flex items-center gap-2">
                  <span className="text-[#4FD1C5]">✓</span>
                  Provide accurate and complete information
                </li>
                <li className="text-[#CBD5E0] flex items-center gap-2">
                  <span className="text-[#4FD1C5]">✓</span>
                  Must be at least <strong className="text-white">13 years old</strong>
                </li>
                <li className="text-[#CBD5E0] flex items-center gap-2">
                  <span className="text-[#4FD1C5]">✓</span>
                  Maintain account security
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium text-[#81E6D9] mb-3">Account Responsibilities</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-[#2D3748] p-3 rounded-lg">
                <p className="text-[#CBD5E0] text-sm">🔐 Keep OAuth credentials secure</p>
              </div>
              <div className="bg-[#2D3748] p-3 rounded-lg">
                <p className="text-[#CBD5E0] text-sm">🚨 Report unauthorized access</p>
              </div>
              <div className="bg-[#2D3748] p-3 rounded-lg">
                <p className="text-[#CBD5E0] text-sm">✋ One account per user</p>
              </div>
              <div className="bg-[#2D3748] p-3 rounded-lg">
                <p className="text-[#CBD5E0] text-sm">📝 You&apos;re liable for your activities</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Token System */}
      <section id="tokens" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Token System & Usage
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-[#4FD1C5]/10 to-transparent p-6 rounded-xl border border-[#4FD1C5]/30">
            <h3 className="text-[#81E6D9] font-semibold mb-3">🎁 Free Tier</h3>
            <ul className="space-y-2 text-[#CBD5E0]">
              <li>• <strong className="text-white">30 free tokens</strong> for new users</li>
              <li>• Each scan consumes <strong className="text-white">1 token</strong></li>
              <li>• Referral rewards: <strong className="text-white">30 tokens</strong> each</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-[#4FD1C5]/10 to-transparent p-6 rounded-xl border border-[#4FD1C5]/30">
            <h3 className="text-[#81E6D9] font-semibold mb-3">💳 Token Packages</h3>
            <ul className="space-y-2 text-[#CBD5E0]">
              <li>• Starter: <strong className="text-white">RM19.90</strong> (50 tokens)</li>
              <li>• Standard: <strong className="text-white">RM49.90</strong> (200 tokens)</li>
              <li>• Premium: <strong className="text-white">RM99.90</strong> (500 tokens)</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 bg-[#2D3748] p-4 rounded-lg border border-[#4A5568]">
          <p className="text-[#CBD5E0] text-sm">
            <strong className="text-white">Note:</strong> Tokens are non-refundable and non-transferable. Tokens do not expire while your account is active. Account closure forfeits remaining tokens.
          </p>
        </div>
      </section>

      {/* Section 6: Acceptable Use */}
      <section id="acceptable-use" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Acceptable Use Policy
        </h2>
        <p className="text-[#CBD5E0] mb-4">You agree <strong className="text-white">NOT</strong> to:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: '🚫', text: 'Use for illegal purposes or unauthorized medical practice' },
            { icon: '⚠️', text: 'Upload inappropriate, offensive, or harmful content' },
            { icon: '🔓', text: 'Attempt to reverse engineer or hack the Service' },
            { icon: '🤖', text: 'Create automated bots or scrapers' },
            { icon: '💸', text: 'Share, resell, or transfer your account or tokens' },
            { icon: '🎭', text: 'Misrepresent yourself or impersonate others' },
            { icon: '🚧', text: 'Interfere with other users&apos; access' },
            { icon: '🦠', text: 'Upload viruses, malware, or malicious code' },
          ].map((item, index) => (
            <div key={index} className="bg-[#2D3748] p-3 rounded-lg border border-[#4A5568] flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-[#CBD5E0] text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: Intellectual Property */}
      <section id="intellectual-property" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Intellectual Property Rights
        </h2>
        <div className="space-y-4">
          <div className="bg-[#2D3748] p-4 rounded-lg border-l-4 border-[#4FD1C5]">
            <h4 className="text-white font-medium mb-2">📱 Our Content</h4>
            <p className="text-[#CBD5E0] text-sm">
              All content, features, and functionality (text, graphics, logos, code, AI models, algorithms) are owned by MedWira and protected by intellectual property laws.
            </p>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg border-l-4 border-[#81E6D9]">
            <h4 className="text-white font-medium mb-2">📸 Your Content</h4>
            <p className="text-[#CBD5E0] text-sm">
              You retain ownership of uploaded images. By uploading, you grant us a license to process, analyze, and store images to provide the Service. We may use anonymized data for improvement.
            </p>
          </div>
        </div>
      </section>

      {/* Section 8: Liability */}
      <section id="liability" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Limitation of Liability
        </h2>
        <div className="bg-yellow-900/20 border-2 border-yellow-500/40 rounded-lg p-6">
          <p className="text-yellow-100 font-semibold mb-3 uppercase tracking-wide">
            To the maximum extent permitted by law:
          </p>
          <ul className="space-y-2 text-yellow-200/90">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>MedWira is provided <strong>&quot;AS IS&quot;</strong> without warranties of any kind</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>We are <strong>NOT liable</strong> for medical decisions made using our Service</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>We are <strong>NOT liable</strong> for AI errors, inaccuracies, or omissions</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>We are <strong>NOT liable</strong> for indirect, incidental, or consequential damages</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Our total liability shall not exceed the amount you paid in the last <strong>12 months</strong></span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 9: Indemnification */}
      <section id="indemnification" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Indemnification
        </h2>
        <p className="text-[#CBD5E0]">
          You agree to <strong className="text-white">indemnify and hold MedWira harmless</strong> from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Service, violation of these Terms, or infringement of any rights.
        </p>
      </section>

      {/* Section 10: Modifications */}
      <section id="modifications" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Service Modifications & Termination
        </h2>
        <p className="text-[#CBD5E0] mb-3">We reserve the right to:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-[#2D3748] p-3 rounded-lg">
            <p className="text-[#CBD5E0] text-sm">🔧 Modify or suspend the Service</p>
          </div>
          <div className="bg-[#2D3748] p-3 rounded-lg">
            <p className="text-[#CBD5E0] text-sm">💰 Change pricing with notice</p>
          </div>
          <div className="bg-[#2D3748] p-3 rounded-lg">
            <p className="text-[#CBD5E0] text-sm">🚫 Terminate accounts for violations</p>
          </div>
          <div className="bg-[#2D3748] p-3 rounded-lg">
            <p className="text-[#CBD5E0] text-sm">🗑️ Remove violating content</p>
          </div>
        </div>
      </section>

      {/* Section 11: Disputes */}
      <section id="disputes" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Dispute Resolution
        </h2>
        <div className="bg-[#2D3748] p-5 rounded-lg border border-[#4A5568]">
          <p className="text-[#CBD5E0] mb-3">Any disputes shall be resolved through:</p>
          <ol className="space-y-2 text-[#CBD5E0]">
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5] font-semibold">1.</span>
              <span>Good faith negotiation between parties</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5] font-semibold">2.</span>
              <span>Mediation if negotiation fails</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5] font-semibold">3.</span>
              <span>Arbitration in accordance with Malaysian laws</span>
            </li>
          </ol>
          <p className="text-[#A0AEC0] text-sm mt-3 italic">
            These Terms are governed by the laws of Malaysia, excluding conflict of law provisions.
          </p>
        </div>
      </section>

      {/* Section 12: Changes */}
      <section id="changes" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Changes to Terms
        </h2>
        <p className="text-[#CBD5E0]">
          We may update these Terms from time to time. Material changes will be notified via email or Service notification. Continued use after changes constitutes acceptance of updated Terms.
        </p>
      </section>

      {/* Section 13: Contact */}
      <section id="contact" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Contact Information
        </h2>
        <p className="text-[#CBD5E0] mb-4">For questions, concerns, or support regarding these Terms:</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-[#2D3748] p-4 rounded-lg text-center">
            <div className="text-2xl mb-2">⚖️</div>
            <p className="text-[#A0AEC0] text-xs mb-1">Legal</p>
            <a href="mailto:legal@medwira.com" className="text-[#4FD1C5] hover:underline text-sm">
              legal@medwira.com
            </a>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg text-center">
            <div className="text-2xl mb-2">💬</div>
            <p className="text-[#A0AEC0] text-xs mb-1">Support</p>
            <a href="mailto:support@medwira.com" className="text-[#4FD1C5] hover:underline text-sm">
              support@medwira.com
            </a>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg text-center">
            <div className="text-2xl mb-2">🌐</div>
            <p className="text-[#A0AEC0] text-xs mb-1">Website</p>
            <a href="https://medwira.com" className="text-[#4FD1C5] hover:underline text-sm">
              medwira.com
            </a>
          </div>
        </div>
      </section>

      {/* Final Acknowledgment */}
      <div className="bg-gradient-to-r from-[#4FD1C5]/20 to-transparent p-6 rounded-xl border-2 border-[#4FD1C5]/40 text-center">
        <p className="text-[#4FD1C5] font-semibold text-lg mb-2">
          BY USING MEDWIRA, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
        </p>
        <p className="text-[#A0AEC0] text-sm">
          If you do not agree to these Terms, you must immediately cease using the Service.
        </p>
      </div>
    </LegalPageLayout>
  );
}
