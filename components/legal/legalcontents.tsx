// components/legal/LegalContent.tsx
"use client";

export function PrivacyContent() {
  return (
    <div className="space-y-4 leading-relaxed text-sm text-muted-foreground">

      <p>
        This Privacy Policy explains how <strong>SynthQA</strong> (“we”, “us”)
        collects, uses, and protects information for our AI-powered test case generator.
      </p>

      <h2 className="mt-6 text-base font-semibold text-foreground">What we collect</h2>
      <ul className="list-disc pl-5">
        <li><strong>Account:</strong> name, email, (optional) company name</li>
        <li><strong>App content:</strong> prompts/requirements, generated test cases, your added/edited cases</li>
        <li><strong>Usage/device:</strong> events, diagnostics</li>
        <li><strong>Network:</strong> IP address (planned), timestamps, request metadata</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold text-foreground">How we use information</h2>
      <ul className="list-disc pl-5">
        <li>Operate and improve the Service, including cross-platform test cases</li>
        <li>Authenticate, secure accounts, and prevent abuse</li>
        <li>Measure usage, debug, and develop features</li>
        <li>Communicate updates and support</li>
        <li>Comply with law and enforce our Terms</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold text-foreground">AI providers & subprocessors</h2>
      <ul className="list-disc pl-5">
      <p>We use third-party processors to deliver the Service, including:</p>
        <li>OpenAI / Anthropic (LLMs)</li>
        <li>Database/hosting (e.g., Supabase/Postgres)</li>
        <li>Operational tools (email, logging, analytics)</li>
      </ul>
      <p>Where available, we opt out of provider model-training on your content.</p>

      <h2 className="mt-6 text-base font-semibold text-foreground">Retention, Security, Transfers</h2>
     <p>We retain data while your account is active and as needed to provide the Service. You can request deletion; limited records may be kept for legal, security, or billing purposes.</p>

  <h2>Security</h2>
  <p>We use industry-standard measures to protect information in transit and at rest, but no method is 100% secure.</p>

  <h2>International transfers</h2>
  <p>Your information may be processed in the United States and other countries where our vendors operate. Appropriate safeguards are applied where required.</p>

  <h2>Your rights</h2>
  <p>Depending on your location, you may have rights to access, correct, export, or delete your data, or object to certain processing. Contact: <a href="mailto:support@synthqa.app">support@sythnqa.app</a>.</p>

  <h2>Children</h2>
  <p>The Service is not directed to children under 13 (or the minimum age in your jurisdiction).</p>

  <h2>Changes to this policy</h2>
  <p>We may update this Privacy Policy. If changes are material, we’ll provide notice (e.g., in-app or by email).</p>

      <h2 className="mt-6 text-base font-semibold text-foreground">Your rights</h2>
      <p>
        Depending on your location, you may access, correct, export, or delete your data, or object to certain processing.
        Contact: <a href="mailto:support@synthqa.app" className="underline">support@synthqa.app</a>.
      </p>
      <p><strong>Last updated:</strong> 2025-11-10</p>

    </div>
  );
}

export function TermsContent() {
  return (
    <div className="space-y-4 leading-relaxed text-sm text-muted-foreground">

      <p>
        These Terms govern your use of <strong>SynthQA</strong> (“Service”). By using the Service, you agree to them.
      </p>

      <h2 className="mt-6 text-base font-semibold text-foreground">1. The Service</h2>
      <p>
        SynthQA provides AI-assisted test case generation (including cross-platform).
        Outputs may contain errors; you must review/validate before use.
      </p>

      <h2 className="mt-6 text-base font-semibold text-foreground">2. Accounts</h2>
      <ul className="list-disc pl-5">
        <li>You must provide accurate info and keep credentials secure.</li>
        <li>You must be of legal age and authorized for your org if applicable.</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold text-foreground">3. Your content & outputs</h2>
      <ul className="list-disc pl-5">
        <li>You own your prompts/requirements/test cases (“Customer Content”).</li>
        <li>You grant us a limited license to process content to provide/improve the Service.</li>
        <li>Outputs may be inaccurate; use at your own risk.</li>
        <li>We may use third-party AI providers (e.g., OpenAI, Anthropic) to generate outputs.</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold text-foreground">4. Acceptable use</h2>
      <ul className="list-disc pl-5">
        <li>No illegal, infringing, or abusive activity.</li>
        <li>No reverse engineering or circumventing security or usage limits.</li>
        <li>No misuse of outputs (e.g., to create malware, violate rights, or mislead users).</li>

      </ul>

      <h2 className="mt-6 text-base font-semibold text-foreground">5. Fees</h2>
      <p>Paid features may apply; fees are typically prepaid and non-refundable where permitted by law.</p>

      <h2 className="mt-6 text-base font-semibold text-foreground">6. IP, Warranty, Liability</h2>
      <p>
         TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER SYNTHQA NOR ITS SUPPLIERS ARE LIABLE FOR INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL. OUR TOTAL
        LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNTS PAID BY YOU TO US IN THE 12 MONTHS
        PRECEDING THE CLAIM.
      </p>

      <h2 className="mt-6 text-base font-semibold text-foreground">7. Termination & Changes</h2>
      <p>
        We may suspend/terminate for violations or risk. We may update the Service/Terms with notice for material changes.
      </p>
       
       <h2 className="mt-6 text-base font-semibold text-foreground">8. Governing law; disputes</h2>
      <p>
        These Terms are governed by the laws of your primary operating jurisdiction (set your preferred venue). Courts
        in that venue will have exclusive jurisdiction.      
      </p>

       <h2 className="mt-6 text-base font-semibold text-foreground">9. Contact</h2>
      <p>
        Questions about these Terms:{" "}
        Contact: <a href="mailto:legal@synthqa.app" className="underline">legal@synthqa.app</a>.
        </p> 
        <p><strong>Last updated:</strong> 2025-11-10</p>

    </div>
  );
}
