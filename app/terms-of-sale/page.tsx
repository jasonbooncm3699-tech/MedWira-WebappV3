'use client';

import React from 'react';
import LegalPageLayout from '@/components/LegalPageLayout';

/**
 * Terms of Sale Page - Enhanced with Shopee-inspired pricing cards
 * Visual token packages with gradient designs
 * Clear refund policy with prominent warnings
 */
export default function TermsOfSale() {
  const sections = [
    { id: 'packages', title: 'Token Packages & Pricing' },
    { id: 'purchase', title: 'Purchase Process' },
    { id: 'token-usage', title: 'Token Usage & Validity' },
    { id: 'ai-service-terms', title: 'AI Health Assistant Service Terms' },
    { id: 'refund', title: 'Refund & Cancellation' },
    { id: 'referral', title: 'Referral Program' },
    { id: 'taxes', title: 'Taxes & Fees' },
    { id: 'service-changes', title: 'Service Availability' },
    { id: 'subscriptions', title: 'Future Subscriptions' },
    { id: 'billing-disputes', title: 'Billing Disputes' },
    { id: 'promo-codes', title: 'Promotional Codes' },
    { id: 'security', title: 'Payment Security' },
    { id: 'contact', title: 'Contact & Support' },
  ];

  return (
    <LegalPageLayout
      title="Terms of Sale"
      lastUpdated="January 15, 2025"
      sections={sections}
      currentPage="terms-of-sale"
    >
      {/* Section 1: Token Packages - Shopee-inspired pricing cards */}
      <section id="packages" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Token Packages & Pricing
        </h2>
        <p className="text-[#CBD5E0] mb-6">
          MedWira offers token-based access to our AI-powered personal health assistant service that provides fast, trustworthy answers to your health, medication, and wellness questions. All prices are in Malaysian Ringgit (RM) and include applicable taxes.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter Pack */}
          <div className="group bg-gradient-to-br from-[#2D3748] to-[#1A202C] rounded-2xl p-6 border border-[#4A5568] hover:border-[#4FD1C5] transition-all hover:shadow-lg hover:shadow-[#4FD1C5]/20 transform hover:scale-105">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🥉</div>
              <h3 className="text-2xl font-bold text-white mb-1">Starter Pack</h3>
              <div className="inline-block px-3 py-1 bg-[#4A5568] rounded-full text-xs text-[#CBD5E0]">
                For Casual Users
              </div>
            </div>
            <div className="text-center py-6 border-y border-[#4A5568]">
              <div className="text-4xl font-bold text-[#4FD1C5] mb-2">RM 19.90</div>
              <div className="text-[#A0AEC0] mb-1">50 Tokens</div>
              <div className="text-sm text-[#718096]">RM 0.398 per token</div>
            </div>
            <ul className="mt-6 space-y-3">
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                50 AI health consultations
              </li>
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                ~2-3 months usage
              </li>
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                Instant activation
              </li>
            </ul>
          </div>

          {/* Standard Pack - BEST VALUE */}
          <div className="group bg-gradient-to-br from-[#4FD1C5]/20 via-[#2D3748] to-[#1A202C] rounded-2xl p-6 border-2 border-[#4FD1C5] hover:shadow-2xl hover:shadow-[#4FD1C5]/40 transform scale-105 md:scale-110 z-10">
            <div className="text-center mb-4">
              <div className="inline-block px-3 py-1 bg-[#4FD1C5] text-[#1A202C] rounded-full text-xs font-bold mb-3">
                BEST VALUE ⭐
              </div>
              <div className="text-5xl mb-3">🥈</div>
              <h3 className="text-2xl font-bold text-white mb-1">Standard Pack</h3>
              <div className="inline-block px-3 py-1 bg-[#4FD1C5]/20 rounded-full text-xs text-[#4FD1C5]">
                Most Popular
              </div>
            </div>
            <div className="text-center py-6 border-y border-[#4FD1C5]/30">
              <div className="text-4xl font-bold text-[#4FD1C5] mb-2">RM 49.90</div>
              <div className="text-[#CBD5E0] mb-1">200 Tokens</div>
              <div className="text-sm text-[#81E6D9]">RM 0.250 per token</div>
              <div className="inline-block mt-2 px-2 py-1 bg-[#4FD1C5]/20 rounded text-xs text-[#4FD1C5] font-semibold">
                37% OFF
              </div>
            </div>
            <ul className="mt-6 space-y-3">
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                200 AI health consultations
              </li>
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                ~6-8 months usage
              </li>
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                Best value per token
              </li>
            </ul>
          </div>

          {/* Premium Pack */}
          <div className="group bg-gradient-to-br from-[#2D3748] to-[#1A202C] rounded-2xl p-6 border border-[#4A5568] hover:border-[#4FD1C5] transition-all hover:shadow-lg hover:shadow-[#4FD1C5]/20 transform hover:scale-105">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🥇</div>
              <h3 className="text-2xl font-bold text-white mb-1">Premium Pack</h3>
              <div className="inline-block px-3 py-1 bg-[#4A5568] rounded-full text-xs text-[#CBD5E0]">
                For Power Users
              </div>
            </div>
            <div className="text-center py-6 border-y border-[#4A5568]">
              <div className="text-4xl font-bold text-[#4FD1C5] mb-2">RM 99.90</div>
              <div className="text-[#A0AEC0] mb-1">500 Tokens</div>
              <div className="text-sm text-[#718096]">RM 0.200 per token</div>
              <div className="inline-block mt-2 px-2 py-1 bg-[#81E6D9]/20 rounded text-xs text-[#81E6D9] font-semibold">
                50% OFF
              </div>
            </div>
            <ul className="mt-6 space-y-3">
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                500 AI health consultations
              </li>
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                ~12-18 months usage
              </li>
              <li className="text-[#CBD5E0] flex items-center gap-2 text-sm">
                <span className="text-[#4FD1C5]">✓</span>
                Maximum savings
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: Purchase Process */}
      <section id="purchase" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Purchase Process
        </h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-medium text-[#81E6D9] mb-3">Payment Methods</h3>
            <p className="text-[#CBD5E0] mb-3">We accept the following via Stripe:</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#2D3748] p-4 rounded-lg text-center border border-[#4A5568]">
                <div className="text-3xl mb-2">💳</div>
                <p className="text-[#CBD5E0] text-sm font-medium">Credit Cards</p>
                <p className="text-[#718096] text-xs">Visa, Mastercard, Amex</p>
              </div>
              <div className="bg-[#2D3748] p-4 rounded-lg text-center border border-[#4A5568]">
                <div className="text-3xl mb-2">🏦</div>
                <p className="text-[#CBD5E0] text-sm font-medium">Debit Cards</p>
                <p className="text-[#718096] text-xs">All major banks</p>
              </div>
              <div className="bg-[#2D3748] p-4 rounded-lg text-center border border-[#4A5568]">
                <div className="text-3xl mb-2">🇲🇾</div>
                <p className="text-[#CBD5E0] text-sm font-medium">Online Banking</p>
                <p className="text-[#718096] text-xs">FPX for Malaysia</p>
              </div>
              <div className="bg-[#2D3748] p-4 rounded-lg text-center border border-[#4A5568]">
                <div className="text-3xl mb-2">📱</div>
                <p className="text-[#CBD5E0] text-sm font-medium">Digital Wallets</p>
                <p className="text-[#718096] text-xs">Where available</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium text-[#81E6D9] mb-3">Order Confirmation</h3>
            <div className="bg-[#2D3748] p-4 rounded-lg border border-[#4A5568]">
              <ul className="space-y-2 text-[#CBD5E0]">
                <li className="flex items-center gap-2">
                  <span className="text-[#4FD1C5]">→</span>
                  Verified account required (Google/Facebook OAuth)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#4FD1C5]">→</span>
                  Email confirmation sent upon successful purchase
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#4FD1C5]">→</span>
                  Tokens added <strong className="text-white">instantly</strong> after payment
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#4FD1C5]">→</span>
                  Secure processing by Stripe
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Token Usage */}
      <section id="token-usage" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Token Usage & Validity
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-[#4FD1C5]/10 to-transparent p-5 rounded-lg border border-[#4FD1C5]/30">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Usage
            </h4>
            <ul className="space-y-2 text-[#CBD5E0] text-sm">
              <li>• Each AI health consultation = <strong className="text-white">1 token</strong></li>
              <li>• Tokens <strong className="text-white">never expire</strong> (while account active)</li>
              <li>• Instant deduction upon consultation</li>
              <li>• Includes medicine analysis, health advice, and wellness guidance</li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-[#4FD1C5]/10 to-transparent p-5 rounded-lg border border-[#4FD1C5]/30">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              Restrictions
            </h4>
            <ul className="space-y-2 text-[#CBD5E0] text-sm">
              <li>• <strong className="text-white">Non-transferable</strong> between accounts</li>
              <li>• <strong className="text-white">No cash value</strong> - cannot be exchanged</li>
              <li>• Forfeited if account closed</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4: AI Health Assistant Service Terms */}
      <section id="ai-service-terms" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          AI Health Assistant Service Terms
        </h2>
        <p className="text-[#CBD5E0] mb-4">
          By purchasing tokens, you agree to the following terms regarding our AI health assistant service:
        </p>
        
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#4FD1C5]/10 to-transparent p-6 rounded-lg border border-[#4FD1C5]/30">
            <h3 className="text-xl font-medium text-[#81E6D9] mb-3 flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              AI Service Scope
            </h3>
            <ul className="space-y-2 text-[#CBD5E0]">
              <li className="flex items-start gap-2">
                <span className="text-[#4FD1C5] mt-1">•</span>
                <span><strong className="text-white">Health Consultation:</strong> AI-powered health advice and wellness guidance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4FD1C5] mt-1">•</span>
                <span><strong className="text-white">Medicine Analysis:</strong> Drug identification, interactions, and safety information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4FD1C5] mt-1">•</span>
                <span><strong className="text-white">Multi-language Support:</strong> AI responses in 10 Southeast Asian languages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4FD1C5] mt-1">•</span>
                <span><strong className="text-white">Personalized Service:</strong> Tailored health information based on your queries</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#2D3748] p-6 rounded-lg border border-[#4A5568]">
            <h3 className="text-xl font-medium text-[#81E6D9] mb-3 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Important Service Limitations
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-white font-medium mb-2">AI Limitations</h4>
                <ul className="space-y-1 text-sm text-[#CBD5E0]">
                  <li>• AI responses may contain errors</li>
                  <li>• Not a substitute for medical professionals</li>
                  <li>• Cannot perform physical examinations</li>
                  <li>• Information may be outdated</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Usage Requirements</h4>
                <ul className="space-y-1 text-sm text-[#CBD5E0]">
                  <li>• Must provide accurate health information</li>
                  <li>• Cannot abuse AI for inappropriate queries</li>
                  <li>• Responsible for health decisions made</li>
                  <li>• Must seek professional help when needed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg">
            <p className="text-yellow-200">
              <strong>Critical:</strong> Tokens purchased provide access to AI health consultation services. All AI responses are for informational purposes only and should not replace professional medical advice. You are responsible for all health decisions made based on AI responses.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Refund Policy - PROMINENT WARNING */}
      <section id="refund" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-yellow-500 rounded-full animate-pulse"></span>
          Refund & Cancellation Policy
        </h2>
        <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border-2 border-yellow-500/50 rounded-xl p-6 shadow-lg shadow-yellow-500/20">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-5xl">⚠️</div>
            <div>
              <h3 className="text-yellow-400 font-bold text-xl mb-3">IMPORTANT REFUND POLICY</h3>
              <div className="bg-yellow-950/40 p-4 rounded-lg border border-yellow-500/30 mb-4">
                <p className="text-yellow-100 font-semibold text-lg">
                  All token purchases are <span className="text-yellow-300">FINAL and NON-REFUNDABLE</span>
                </p>
                <p className="text-yellow-200/80 text-sm mt-2">
                  Once tokens are added to your account, they cannot be refunded, even if unused. This includes tokens used for AI health consultation services.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2">Exceptions (Refunds MAY be considered):</h4>
              <ul className="space-y-2 text-yellow-100/90 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">✓</span>
                  <span>Duplicate charges due to technical error</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">✓</span>
                  <span>Tokens not credited within 24 hours of payment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">✓</span>
                  <span>AI service unavailability for extended periods (7+ days)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">✓</span>
                  <span>AI responses consistently failing to meet quality standards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">✓</span>
                  <span>Fraudulent or unauthorized transactions (with proof)</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-950/40 p-4 rounded-lg border border-yellow-500/20">
              <p className="text-yellow-200 text-sm">
                <strong>To request a refund:</strong> Contact{' '}
                <a href="mailto:billing@medwira.com" className="text-yellow-400 hover:underline font-semibold">
                  billing@medwira.com
                </a>{' '}
                within 7 days of purchase with transaction details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Referral Program - Highlighted */}
      <section id="referral" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Referral Program
        </h2>
        <div className="bg-gradient-to-r from-[#4FD1C5]/20 to-[#81E6D9]/10 rounded-2xl p-8 border-2 border-[#4FD1C5]/40">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-5xl">🎁</div>
            <div>
              <h3 className="text-[#4FD1C5] font-bold text-2xl mb-2">Earn Free Tokens!</h3>
              <p className="text-[#CBD5E0]">Invite friends and both of you get rewarded</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#2D3748] p-5 rounded-xl border border-[#4FD1C5]/30">
              <div className="text-3xl mb-3">👥</div>
              <h4 className="text-white font-semibold mb-2">Referrer Reward</h4>
              <p className="text-[#4FD1C5] text-2xl font-bold mb-1">30 Tokens</p>
              <p className="text-[#CBD5E0] text-sm">For each successful referral</p>
            </div>
            <div className="bg-[#2D3748] p-5 rounded-xl border border-[#4FD1C5]/30">
              <div className="text-3xl mb-3">🆕</div>
              <h4 className="text-white font-semibold mb-2">New User Bonus</h4>
              <p className="text-[#4FD1C5] text-2xl font-bold mb-1">30 Tokens</p>
              <p className="text-[#CBD5E0] text-sm">For signing up via referral</p>
            </div>
          </div>

          <div className="mt-6 bg-[#1A202C]/50 p-4 rounded-lg">
            <ul className="space-y-2 text-[#CBD5E0] text-sm">
              <li className="flex items-center gap-2">
                <span className="text-[#4FD1C5]">•</span>
                <span><strong className="text-white">No limit</strong> on referrals</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#4FD1C5]">•</span>
                <span>Tokens credited within <strong className="text-white">24 hours</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#4FD1C5]">•</span>
                <span>Referral must <strong className="text-white">create account & verify</strong> via OAuth</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 6: Taxes & Fees */}
      <section id="taxes" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Taxes & Fees
        </h2>
        <div className="space-y-4">
          <div className="bg-[#2D3748] p-4 rounded-lg border-l-4 border-[#4FD1C5]">
            <h4 className="text-white font-medium mb-2">💰 Pricing Includes Taxes</h4>
            <p className="text-[#CBD5E0] text-sm">
              All displayed prices include applicable Malaysian taxes (SST/GST as required by law).
            </p>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg border-l-4 border-[#81E6D9]">
            <h4 className="text-white font-medium mb-2">🔒 No Hidden Fees</h4>
            <p className="text-[#CBD5E0] text-sm">
              Stripe payment processing fees are absorbed by MedWira. You pay only the displayed price.
            </p>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg border-l-4 border-[#38B2AC]">
            <h4 className="text-white font-medium mb-2">🌍 Currency</h4>
            <p className="text-[#CBD5E0] text-sm">
              All transactions in Malaysian Ringgit (RM). International users may incur bank conversion fees.
            </p>
          </div>
        </div>
      </section>

      {/* Remaining sections continue with similar enhanced styling... */}
      <section id="service-changes" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Service Availability & Changes
        </h2>
        <div className="bg-[#2D3748] p-5 rounded-lg border border-[#4A5568]">
          <p className="text-[#CBD5E0] mb-3">MedWira reserves the right to:</p>
          <ul className="space-y-2 text-[#CBD5E0]">
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">•</span>
              <span>Modify token pricing with <strong className="text-white">30 days&apos; notice</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">•</span>
              <span>Adjust token allocations (existing tokens unaffected)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">•</span>
              <span>Discontinue packages (existing tokens remain valid)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5]">•</span>
              <span>Offer promotional pricing or discounts</span>
            </li>
          </ul>
          <p className="text-[#81E6D9] text-sm mt-4 font-medium">
            ✓ Grandfather Clause: Tokens purchased before pricing changes retain original value
          </p>
        </div>
      </section>

      <section id="subscriptions" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Future Subscription Plans
        </h2>
        <p className="text-[#CBD5E0]">
          MedWira may introduce subscription plans in the future. Current token purchases are <strong className="text-white">one-time payments</strong> and do NOT constitute recurring subscriptions. Any future subscription offerings will be subject to separate terms.
        </p>
      </section>

      <section id="billing-disputes" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Billing Disputes
        </h2>
        <div className="bg-[#2D3748] p-5 rounded-lg border border-[#4A5568]">
          <p className="text-[#CBD5E0] mb-3">If you believe there is an error in your billing:</p>
          <ol className="space-y-2 text-[#CBD5E0]">
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5] font-semibold">1.</span>
              <span>Contact <a href="mailto:billing@medwira.com" className="text-[#4FD1C5] hover:underline">billing@medwira.com</a> within 30 days</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5] font-semibold">2.</span>
              <span>Provide transaction ID, date, and issue description</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5] font-semibold">3.</span>
              <span>We investigate and respond within <strong className="text-white">5 business days</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4FD1C5] font-semibold">4.</span>
              <span>Valid disputes receive refund or token credit</span>
            </li>
          </ol>
          <p className="text-[#A0AEC0] text-sm mt-3 italic">
            Note: Chargebacks without contacting us may result in account suspension
          </p>
        </div>
      </section>

      <section id="promo-codes" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Promotional Codes & Discounts
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#2D3748] p-4 rounded-lg">
            <p className="text-[#CBD5E0] text-sm">🎟️ Subject to specific terms & expiration</p>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg">
            <p className="text-[#CBD5E0] text-sm">🚫 Cannot combine with other offers</p>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg">
            <p className="text-[#CBD5E0] text-sm">1️⃣ One-time use per account</p>
          </div>
          <div className="bg-[#2D3748] p-4 rounded-lg">
            <p className="text-[#CBD5E0] text-sm">⚡ MedWira reserves right to revoke fraud</p>
          </div>
        </div>
      </section>

      <section id="security" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Payment Security & Privacy
        </h2>
        <div className="bg-gradient-to-br from-[#4FD1C5]/10 to-transparent p-6 rounded-xl border border-[#4FD1C5]/30">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-3xl mb-2">🛡️</div>
              <h4 className="text-white font-semibold mb-2">PCI DSS Level 1</h4>
              <p className="text-[#CBD5E0] text-sm">All payments via Stripe (highest security certification)</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🔒</div>
              <h4 className="text-white font-semibold mb-2">No Card Storage</h4>
              <p className="text-[#CBD5E0] text-sm">MedWira does NOT store credit card information</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🔐</div>
              <h4 className="text-white font-semibold mb-2">Encrypted Transactions</h4>
              <p className="text-[#CBD5E0] text-sm">All payment data encrypted using TLS/SSL</p>
            </div>
            <div>
              <div className="text-3xl mb-2">📋</div>
              <h4 className="text-white font-semibold mb-2">Health Data Privacy</h4>
              <p className="text-[#CBD5E0] text-sm">
                Health information processed during AI consultations is protected per our <a href="/privacy" className="text-[#4FD1C5] hover:underline">Privacy Policy</a>
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">🏥</div>
              <h4 className="text-white font-semibold mb-2">Data Processing</h4>
              <p className="text-[#CBD5E0] text-sm">
                Purchase data and health consultation logs are processed securely for service provision
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="mb-12 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-8 bg-[#4FD1C5] rounded-full"></span>
          Contact & Support
        </h2>
        <p className="text-[#CBD5E0] mb-4">For billing, payment, or sales inquiries:</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#2D3748] p-5 rounded-lg text-center border border-[#4A5568] hover:border-[#4FD1C5] transition-colors">
            <div className="text-3xl mb-2">💰</div>
            <p className="text-[#A0AEC0] text-xs mb-1">Billing Support</p>
            <a href="mailto:billing@medwira.com" className="text-[#4FD1C5] hover:underline text-sm">
              billing@medwira.com
            </a>
          </div>
          <div className="bg-[#2D3748] p-5 rounded-lg text-center border border-[#4A5568] hover:border-[#4FD1C5] transition-colors">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-[#A0AEC0] text-xs mb-1">General Support</p>
            <a href="mailto:support@medwira.com" className="text-[#4FD1C5] hover:underline text-sm">
              support@medwira.com
            </a>
          </div>
          <div className="bg-[#2D3748] p-5 rounded-lg text-center border border-[#4A5568] hover:border-[#4FD1C5] transition-colors">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-[#A0AEC0] text-xs mb-1">Sales Inquiries</p>
            <a href="mailto:sales@medwira.com" className="text-[#4FD1C5] hover:underline text-sm">
              sales@medwira.com
            </a>
          </div>
        </div>
      </section>

      {/* Final Acknowledgment */}
      <div className="bg-gradient-to-r from-[#4FD1C5]/20 to-transparent p-6 rounded-xl border-2 border-[#4FD1C5]/40 text-center">
        <p className="text-[#4FD1C5] font-semibold text-lg mb-2">
          BY PURCHASING TOKENS, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS OF SALE.
        </p>
        <p className="text-[#A0AEC0] text-sm">
          These Terms of Sale supplement our Terms of Service and Privacy Policy.
        </p>
      </div>
    </LegalPageLayout>
  );
}
