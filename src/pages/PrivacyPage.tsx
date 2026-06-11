import React from 'react'
import { DocsLayout, Section, P, UL } from './DocsLayout'

const EFFECTIVE_DATE = 'June 2026'

export function PrivacyPage() {
  return (
    <DocsLayout title="Privacy Policy">
      <p className="text-xs text-pulse-text-muted mb-8">Effective date: {EFFECTIVE_DATE}</p>

      <Section title="1. Introduction">
        <P>PulseChat ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our platform.</P>
        <P>By using PulseChat, you agree to the collection and use of information in accordance with this policy.</P>
      </Section>

      <Section title="2. Information We Collect">
        <p className="text-sm font-semibold text-white mb-2">Information you provide directly:</p>
        <UL items={[
          'Email address (used for authentication)',
          'Username and display name',
          'Profile picture and banner image',
          'Messages, files, and content you post',
          'Server names, descriptions, and settings you configure',
        ]} />
        <p className="text-sm font-semibold text-white mt-4 mb-2">Information collected automatically:</p>
        <UL items={[
          'Online/offline presence status',
          'Message timestamps and read receipts',
          'Basic usage analytics (pages visited, feature usage)',
          'Browser type and device information',
        ]} />
      </Section>

      <Section title="3. How We Use Your Information">
        <P>We use the information we collect to:</P>
        <UL items={[
          'Provide, operate, and maintain the PulseChat service',
          'Authenticate your identity and secure your account',
          'Enable messaging and community features',
          'Display your profile and presence to other users',
          'Improve our platform based on usage patterns',
          'Send you service-related notifications and updates',
          'Respond to your support requests',
        ]} />
      </Section>

      <Section title="4. Data Storage & Security">
        <P>Your data is stored securely using Google Firebase (Firestore and Firebase Storage), which provides industry-standard encryption in transit (TLS) and at rest. We enforce strict Firestore security rules to ensure users can only access data they are authorised to see.</P>
        <P>We take data security seriously, but no system is 100% secure. If you discover a vulnerability, please report it to <a href="mailto:AevixChat@Hotmail.com" className="text-pulse-brand hover:underline">AevixChat@Hotmail.com</a>.</P>
      </Section>

      <Section title="5. Data Sharing">
        <P>We do not sell, rent, or share your personal data with third parties for marketing purposes.</P>
        <P>We may share data only in these limited circumstances:</P>
        <UL items={[
          'With your consent',
          'To comply with legal obligations or valid legal process',
          'To protect the safety and rights of our users',
          'With service providers (e.g. Firebase/Google) who process data on our behalf under confidentiality agreements',
        ]} />
      </Section>

      <Section title="6. Your Rights">
        <P>Depending on your location, you may have the following rights regarding your personal data:</P>
        <UL items={[
          'Access: Request a copy of the personal data we hold about you',
          'Correction: Request correction of inaccurate or incomplete data',
          'Deletion: Request deletion of your account and associated data',
          'Portability: Request your data in a machine-readable format',
          'Objection: Object to certain types of processing',
        ]} />
        <P>To exercise any of these rights, email us at <a href="mailto:AevixChat@Hotmail.com" className="text-pulse-brand hover:underline">AevixChat@Hotmail.com</a> or use the Data & Privacy controls in your account settings.</P>
      </Section>

      <Section title="7. Data Retention">
        <P>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal purposes.</P>
        <P>Messages and content posted in servers may remain visible to other members until the server or channel is deleted.</P>
      </Section>

      <Section title="8. Cookies">
        <P>PulseChat uses minimal cookies and local storage solely for authentication and session management. We do not use tracking or advertising cookies.</P>
      </Section>

      <Section title="9. Children's Privacy">
        <P>PulseChat is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us.</P>
      </Section>

      <Section title="10. Changes to This Policy">
        <P>We may update this Privacy Policy from time to time. We will notify users of significant changes via email or an in-app notice. Continued use of PulseChat after changes constitutes acceptance of the updated policy.</P>
      </Section>

      <Section title="11. Contact">
        <P>For privacy-related questions or requests, contact us at <a href="mailto:AevixChat@Hotmail.com" className="text-pulse-brand hover:underline">AevixChat@Hotmail.com</a>.</P>
      </Section>
    </DocsLayout>
  )
}
