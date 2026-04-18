import type { Metadata } from "next";
import {
  LegalEmailLink,
  LegalList,
  LegalPageLayout,
  LegalSection,
  legalLastUpdatedLabel,
} from "@/components/layout/LegalPageLayout";

export const dynamic = "force-dynamic";

const APP_NAME = "Lead Finance";

export const metadata: Metadata = {
  title: `Terms of Service — ${APP_NAME}`,
  description: `Terms governing use of ${APP_NAME}.`,
};

export default function TermsPage() {
  const updated = new Date();
  const lastUpdated = legalLastUpdatedLabel(updated);
  const lastUpdatedIso = updated.toISOString().slice(0, 10);

  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated={lastUpdated}
      lastUpdatedIso={lastUpdatedIso}
    >
      <LegalSection title="1. Agreement">
        <p>
          By using {APP_NAME}, you agree to these Terms.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <p>{APP_NAME} provides financial tracking tools.</p>
      </LegalSection>

      <LegalSection title="3. Eligibility">
        <p>You must be at least 16 years old.</p>
      </LegalSection>

      <LegalSection title="4. Accounts">
        <p>You are responsible for your account and its security.</p>
      </LegalSection>

      <LegalSection title="5. Subscription & Payments">
        <LegalList
          items={[
            "Payments are processed via Stripe",
            "Subscriptions may auto-renew",
            "Prices may change",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Refunds">
        <p>Payments are non-refundable unless required by law.</p>
      </LegalSection>

      <LegalSection title="7. Acceptable Use">
        <p>You agree not to misuse or break the app.</p>
      </LegalSection>

      <LegalSection title="8. Financial Disclaimer">
        <p>No financial, tax, or legal advice is provided.</p>
      </LegalSection>

      <LegalSection title="9. Data Accuracy">
        <p>We do not guarantee accuracy.</p>
      </LegalSection>

      <LegalSection title="10. Intellectual Property">
        <p>All content belongs to {APP_NAME}.</p>
      </LegalSection>

      <LegalSection title="11. Termination">
        <p>We may suspend accounts for violations.</p>
      </LegalSection>

      <LegalSection title="12. Limitation of Liability">
        <p>We are not liable for financial loss or data issues.</p>
      </LegalSection>

      <LegalSection title="13. Indemnification">
        <p>You agree to indemnify us.</p>
      </LegalSection>

      <LegalSection title="14. Availability">
        <p>We do not guarantee uptime.</p>
      </LegalSection>

      <LegalSection title="15. Changes">
        <p>We may update these terms.</p>
      </LegalSection>

      <LegalSection title="16. Governing Law">
        <p>Netherlands law applies.</p>
      </LegalSection>

      <LegalSection title="17. Contact">
        <p>
          Email: <LegalEmailLink />
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
