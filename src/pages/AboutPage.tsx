import React from 'react'
import { DocsLayout, Section, P, UL } from './DocsLayout'

export function AboutPage() {
  return (
    <DocsLayout title="About AevixChat">
      <Section title="What is AevixChat?">
        <P>AevixChat is a free, real-time community platform built for everyone — from small friend groups to large public communities. We believe that great communication tools shouldn't cost anything.</P>
        <P>Built with modern web technology (React, Firebase, and Tailwind CSS), AevixChat delivers a fast, beautiful, and reliable messaging experience across all devices.</P>
      </Section>

      <Section title="Our Mission">
        <P>Our mission is to make online communities more accessible, inclusive, and enjoyable. We're building a platform where anyone can create a space for the things they care about — without barriers.</P>
      </Section>

      <Section title="What you can do with AevixChat">
        <UL items={[
          'Create and manage servers (communities) with custom channels and roles',
          'Discover public communities across gaming, music, tech, science, and more',
          'Send direct messages and create group conversations',
          'Share files, images, and links in real time',
          'Invite friends with a unique 6-digit invite code',
          'Set your status, customise your profile, and build your presence',
        ]} />
      </Section>

      <Section title="Who built this?">
        <P>AevixChat is an independent project built by a small team passionate about developer tooling and community software. We're in early access and shipping new features regularly.</P>
      </Section>

      <Section title="Contact">
        <P>Got a question, partnership inquiry, or press request? Reach us at <a href="mailto:AevixChat@Hotmail.com" className="text-pulse-brand hover:underline">AevixChat@Hotmail.com</a>.</P>
      </Section>

      <div className="mt-10 p-5 bg-pulse-brand/10 border border-pulse-brand/20 rounded-2xl">
        <p className="text-sm font-semibold text-pulse-brand mb-1">AevixChat is free — forever for the basics.</p>
        <p className="text-sm text-pulse-text-muted">Sign up today and get unlimited messaging, servers, and community features at no cost.</p>
      </div>
    </DocsLayout>
  )
}
