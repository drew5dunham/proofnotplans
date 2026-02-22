export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 text-foreground">
        <p className="text-sm text-muted-foreground">Last updated: February 22, 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Information We Collect</h2>
          <p className="text-muted-foreground">We collect information you provide directly, including your name, email address, profile photo, and goal data. We also collect usage data such as app interactions, device information, and log data to improve our services.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. How We Use Your Information</h2>
          <p className="text-muted-foreground">We use your information to provide and maintain our service, notify you of changes, allow participation in interactive features, provide support, gather analytics, monitor usage, and detect technical issues.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Data Sharing</h2>
          <p className="text-muted-foreground">We do not sell your personal data. We may share information with service providers who assist in operating our app, or when required by law. Your goal completions and activity are shared with friends and group members based on your privacy settings.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Data Storage & Security</h2>
          <p className="text-muted-foreground">Your data is stored securely using industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Your Rights</h2>
          <p className="text-muted-foreground">You have the right to access, update, or delete your personal information at any time through your account settings. You may also request a copy of your data or ask us to restrict processing.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Cookies & Tracking</h2>
          <p className="text-muted-foreground">We use cookies and similar tracking technologies to maintain your session and remember your preferences. You can control cookie settings through your browser.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Children's Privacy</h2>
          <p className="text-muted-foreground">Our service is not directed to anyone under the age of 13. We do not knowingly collect personal information from children under 13.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">8. Changes to This Policy</h2>
          <p className="text-muted-foreground">We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">9. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this privacy policy, please contact us at{' '}
            <a href="mailto:drew5dunham@gmail.com" className="text-primary underline">
              drew5dunham@gmail.com
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
