'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export default function TermsOfSale() {
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
            Terms of Sale
          </h1>
          <p className="text-gray-400">Last Updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-gray-300 leading-relaxed">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Token Packages and Pricing</h2>
            <p className="mb-4">
              MedWira offers token-based access to medicine identification and analysis services. All prices are in Malaysian Ringgit (RM) and include applicable taxes.
            </p>
            
            <div className="grid md:grid-cols-3 gap-4">
              {/* Starter Pack */}
              <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">🥉</div>
                  <h3 className="text-xl font-semibold text-[#00d4ff]">Starter Pack</h3>
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-3xl font-bold">RM 19.90</p>
                  <p className="text-gray-400">50 Tokens</p>
                  <p className="text-sm text-gray-500">RM 0.398 per token</p>
                </div>
              </div>

              {/* Standard Pack */}
              <div className="bg-gradient-to-br from-[#00d4ff]/20 to-[#0099cc]/20 border border-[#00d4ff]/30 rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">🥈</div>
                  <h3 className="text-xl font-semibold text-[#00d4ff]">Standard Pack</h3>
                  <span className="inline-block bg-[#00d4ff] text-black text-xs px-2 py-1 rounded-full mt-1">
                    BEST VALUE
                  </span>
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-3xl font-bold">RM 49.90</p>
                  <p className="text-gray-400">200 Tokens</p>
                  <p className="text-sm text-gray-500">RM 0.250 per token (37% off)</p>
                </div>
              </div>

              {/* Premium Pack */}
              <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">🥇</div>
                  <h3 className="text-xl font-semibold text-[#00d4ff]">Premium Pack</h3>
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-3xl font-bold">RM 99.90</p>
                  <p className="text-gray-400">500 Tokens</p>
                  <p className="text-sm text-gray-500">RM 0.200 per token (50% off)</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Purchase Process</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">2.1 Payment Methods</h3>
                <p className="mb-2">We accept the following payment methods via Stripe:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Credit Cards (Visa, Mastercard, American Express)</li>
                  <li>Debit Cards</li>
                  <li>Online Banking (FPX for Malaysian users)</li>
                  <li>Digital Wallets (where available)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-[#00d4ff] mb-2">2.2 Order Confirmation</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>All purchases require a verified account (Google or Facebook OAuth)</li>
                  <li>You will receive an email confirmation upon successful purchase</li>
                  <li>Tokens are added to your account instantly after payment confirmation</li>
                  <li>Payment processing is handled securely by Stripe</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Token Usage and Validity</h2>
            <div className="space-y-3">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Token Consumption:</strong> Each medicine scan consumes 1 token</li>
                <li><strong>Non-Expiring:</strong> Purchased tokens do not expire while your account is active</li>
                <li><strong>Non-Transferable:</strong> Tokens cannot be transferred between accounts</li>
                <li><strong>No Cash Value:</strong> Tokens have no monetary value and cannot be exchanged for cash</li>
                <li><strong>Account Closure:</strong> Unused tokens are forfeited if you close your account</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Refund and Cancellation Policy</h2>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 space-y-3">
              <p className="font-semibold text-yellow-400">⚠️ IMPORTANT REFUND POLICY</p>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">4.1 No Refunds</h3>
                  <p>
                    All token purchases are <strong>final and non-refundable</strong>. Once tokens are added to your account, they cannot be refunded, even if unused.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">4.2 Exceptions</h3>
                  <p className="mb-2">Refunds may be considered ONLY in the following cases:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Duplicate charges due to technical error</li>
                    <li>Tokens not credited within 24 hours of payment</li>
                    <li>Service unavailability for extended periods (7+ days)</li>
                    <li>Fraudulent or unauthorized transactions (with proof)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-2">4.3 Refund Requests</h3>
                  <p>
                    To request a refund under exceptional circumstances, contact{' '}
                    <a href="mailto:billing@medwira.com" className="text-[#00d4ff] hover:underline">
                      billing@medwira.com
                    </a>{' '}
                    within 7 days of purchase with transaction details.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Referral Program</h2>
            <div className="space-y-3">
              <p className="mb-3">
                MedWira offers a referral program to reward users who invite friends:
              </p>
              <div className="bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] rounded-lg p-6">
                <ul className="space-y-2">
                  <li><strong>Referrer Reward:</strong> 30 free tokens for each successful referral</li>
                  <li><strong>New User Bonus:</strong> 30 free tokens for signing up via referral link</li>
                  <li><strong>Eligibility:</strong> Referral must create an account and verify via OAuth</li>
                  <li><strong>Limitations:</strong> No limit on referrals, but abuse may result in account suspension</li>
                  <li><strong>Token Distribution:</strong> Tokens credited within 24 hours of referral signup</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Taxes and Fees</h2>
            <div className="space-y-3">
              <p>
                <strong>6.1 Pricing Includes Taxes:</strong> All displayed prices include applicable Malaysian taxes (SST/GST as required by law).
              </p>
              <p>
                <strong>6.2 Payment Processing Fees:</strong> Stripe payment processing fees are absorbed by MedWira. You pay only the displayed price.
              </p>
              <p>
                <strong>6.3 Currency:</strong> All transactions are processed in Malaysian Ringgit (RM). International users may incur currency conversion fees from their bank.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Service Availability and Changes</h2>
            <div className="space-y-3">
              <p>
                MedWira reserves the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modify token pricing with 30 days&apos; notice to existing users</li>
                <li>Adjust token allocations for new packages (existing tokens unaffected)</li>
                <li>Discontinue specific token packages (existing tokens remain valid)</li>
                <li>Offer promotional pricing or limited-time discounts</li>
                <li>Change the number of tokens consumed per scan with notice</li>
              </ul>
              <p className="mt-3">
                <strong>Grandfather Clause:</strong> Tokens purchased before pricing changes retain their original value and terms.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Subscription Plans (Future)</h2>
            <p>
              MedWira may introduce subscription plans in the future. Current token purchases are one-time payments and do NOT constitute recurring subscriptions. Any future subscription offerings will be subject to separate terms.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Billing Disputes</h2>
            <div className="space-y-3">
              <p className="mb-3">
                If you believe there is an error in your billing:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Contact our billing support at <a href="mailto:billing@medwira.com" className="text-[#00d4ff] hover:underline">billing@medwira.com</a> within 30 days</li>
                <li>Provide transaction ID, date, and description of the issue</li>
                <li>We will investigate and respond within 5 business days</li>
                <li>If dispute is valid, we will issue a refund or credit tokens</li>
              </ol>
              <p className="mt-3 text-sm text-gray-400">
                Chargebacks initiated without contacting us may result in account suspension.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Promotional Codes and Discounts</h2>
            <div className="space-y-3">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Promotional codes are subject to specific terms and expiration dates</li>
                <li>Codes cannot be combined with other offers unless stated</li>
                <li>One-time use per account unless specified as multi-use</li>
                <li>MedWira reserves the right to revoke codes obtained fraudulently</li>
                <li>Discounts apply only to the specified token package</li>
              </ul>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Data Security and Privacy</h2>
            <p className="mb-3">
              Payment information security:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>PCI DSS Compliance:</strong> All payments processed through Stripe (PCI Level 1 certified)</li>
              <li><strong>No Card Storage:</strong> MedWira does NOT store credit card information</li>
              <li><strong>Encrypted Transactions:</strong> All payment data encrypted using TLS/SSL</li>
              <li><strong>Privacy Policy:</strong> See our <Link href="/privacy" className="text-[#00d4ff] hover:underline">Privacy Policy</Link> for data handling details</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact and Support</h2>
            <p className="mb-4">
              For billing, payment, or sales inquiries:
            </p>
            <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-6 space-y-2">
              <p><strong>Billing Support:</strong> <a href="mailto:billing@medwira.com" className="text-[#00d4ff] hover:underline">billing@medwira.com</a></p>
              <p><strong>General Support:</strong> <a href="mailto:support@medwira.com" className="text-[#00d4ff] hover:underline">support@medwira.com</a></p>
              <p><strong>Sales Inquiries:</strong> <a href="mailto:sales@medwira.com" className="text-[#00d4ff] hover:underline">sales@medwira.com</a></p>
              <p><strong>Website:</strong> <a href="https://medwira.com" className="text-[#00d4ff] hover:underline">https://medwira.com</a></p>
            </div>
          </section>

          {/* Acceptance */}
          <section className="bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-lg p-6">
            <p className="font-semibold text-[#00d4ff] mb-2">
              BY PURCHASING TOKENS, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS OF SALE.
            </p>
            <p className="text-sm text-gray-400">
              These Terms of Sale supplement our Terms of Service and Privacy Policy.
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
              <Link href="/terms" className="text-gray-400 hover:text-[#00d4ff] transition-colors">
                Terms of Service
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

