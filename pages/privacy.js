import React from 'react';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';

export default function PrivacyPage() {
  return (
    <PublicPolicyLayout title="Privacy Policy">
      <section style={ps.section}>
        <h2 style={ps.h2}>Overview</h2>
        <p style={ps.p}>
          CorpFlowAI provides AI-assisted workflow setup and monitoring services. This policy describes how we handle
          information collected through our public website, intake forms, and service delivery communications.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Information we collect</h2>
        <ul style={ps.ul}>
          <li>Intake form details such as business name, contact name, email, phone, and message content</li>
          <li>Operational information needed to deliver the requested workflow or pilot</li>
          <li>Basic technical logs required to operate and secure the website and services</li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>How we use information</h2>
        <ul style={ps.ul}>
          <li>Review intake requests and respond about fit, scope, and next steps</li>
          <li>Deliver agreed workflow setup, alerts, logs, summaries, and monitoring</li>
          <li>Operate, maintain, and improve our services</li>
          <li>Communicate about the engagement you requested</li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>What we do not do</h2>
        <p style={ps.p}>We do not sell personal data. We do not collect card or banking details through this public website.</p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Retention and updates</h2>
        <p style={ps.p}>
          We retain information for as long as needed to deliver services, meet reasonable business records needs, and
          comply with applicable obligations. You may request access, correction, or deletion of your information by
          contacting us through the intake form on /lead-rescue or the contact page.
        </p>
        <p style={ps.p}>This policy may be updated from time to time. Material changes will be reflected on this page.</p>
      </section>
    </PublicPolicyLayout>
  );
}
