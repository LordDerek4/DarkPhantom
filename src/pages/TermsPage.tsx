import React from 'react'
import { DocsLayout, Section, P, UL } from './DocsLayout'

const EFFECTIVE_DATE = 'June 2026'

export function TermsPage() {
  return (
    <DocsLayout title="Terms of Service">
      <p className="text-xs text-pulse-text-muted mb-8">Effective date: {EFFECTIVE_DATE}</p>

      <Section title="1. Acceptance of Terms">
        <P>By accessing or using PulseChat ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service.</P>
        <P>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</P>
      </Section>

      <Section title="2. Eligibility">
        <P>You must be at least 13 years old to use PulseChat. By using the Service, you represent that you meet this requirement. If you are under 18, you confirm you have parental or guardian consent.</P>
      </Section>

      <Section title="3. Your Account">
        <UL items={[
          'You are responsible for keeping your account credentials secure',
          'You must not share your account with others',
          'You must provide accurate information when creating your account',
          'You must notify us immediately of any unauthorised access to your account',
          'We may suspend or terminate accounts that violate these Terms',
        ]} />
      </Section>

      <Section title="4. Acceptable Use">
        <P>You agree not to use PulseChat to:</P>
        <UL items={[
          'Post or share illegal content, including content that violates copyright, defamation, or privacy laws',
          'Harass, threaten, abuse, or harm other users',
          'Spread misinformation, spam, or engage in phishing',
          'Post NSFW or adult content in servers not designated for it',
          'Attempt to gain unauthorised access to the Service or other accounts',
          'Distribute malware, viruses, or harmful code',
          'Impersonate PulseChat staff, other users, or organisations',
          'Violate any applicable laws or regulations',
        ]} />
      </Section>

      <Section title="5. User Content">
        <P>You retain ownership of content you post on PulseChat. By posting content, you grant us a non-exclusive, royalty-free licence to host, store, and display that content as necessary to operate the Service.</P>
        <P>You are solely responsible for the content you post. We do not pre-screen content but may remove content that violates these Terms.</P>
      </Section>

      <Section title="6. Server Owners & Administrators">
        <P>If you create a server, you are responsible for the community you build and the conduct that takes place within it. You agree to enforce these Terms within your server and to take action against violations.</P>
        <P>We reserve the right to remove servers that violate these Terms or our Community Guidelines.</P>
      </Section>

      <Section title="7. Intellectual Property">
        <P>The PulseChat platform, logo, and branding are owned by PulseChat. You may not use our branding, copy our platform, or represent your project as officially affiliated with PulseChat without written permission.</P>
      </Section>

      <Section title="8. Termination">
        <P>We may suspend or terminate your account at any time for violations of these Terms, with or without notice. You may delete your account at any time in Settings → Privacy & Safety.</P>
      </Section>

      <Section title="9. Disclaimer of Warranties">
        <P>PulseChat is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or meet your specific requirements.</P>
      </Section>

      <Section title="10. Limitation of Liability">
        <P>To the fullest extent permitted by law, PulseChat shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</P>
      </Section>

      <Section title="11. Governing Law">
        <P>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</P>
      </Section>

      <Section title="12. Contact">
        <P>For questions about these Terms, contact us at <a href="mailto:legal@pulsechat.app" className="text-pulse-brand hover:underline">legal@pulsechat.app</a>.</P>
      </Section>
    </DocsLayout>
  )
}
