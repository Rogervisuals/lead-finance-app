import type { Metadata } from "next";
import {
  LegalEmailLink,
  LegalList,
  LegalPageLayout,
  LegalSection,
  LegalSubheading,
  legalLastUpdatedLabel,
} from "@/components/layout/LegalPageLayout";

export const dynamic = "force-dynamic";

const APP_NAME = "Lead Finance";

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `How ${APP_NAME} collects, uses, and protects your personal data.`,
};

export default function PrivacyPage() {
  const updated = new Date();
  const lastUpdated = legalLastUpdatedLabel(updated);
  const lastUpdatedIso = updated.toISOString().slice(0, 10);

  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated={lastUpdated}
      lastUpdatedIso={lastUpdatedIso}
    >
      <LegalSection title="1. Introduction">
        <p>
          This Privacy Policy explains how {APP_NAME} (&quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;) collects, uses, and protects your personal data when you use our
          application.
        </p>
        <p>We comply with the General Data Protection Regulation (GDPR).</p>
      </LegalSection>

      <LegalSection title="2. Data Controller">
        <p>The data controller is:</p>
        <p>
          <strong>Rogervisuals</strong>
        </p>
        <p>
          Email: <LegalEmailLink />
        </p>
      </LegalSection>

      <LegalSection title="3. Personal Data We Collect">
        <LegalSubheading>3.1 Account Data</LegalSubheading>
        <LegalList
          items={["Email address", "Display name", "Authentication data"]}
        />

        <LegalSubheading>3.2 Financial Data</LegalSubheading>
        <LegalList
          items={[
            "Income entries",
            "Expenses",
            "Projects and client data",
            "Time tracking data",
          ]}
        />

        <LegalSubheading>3.3 Usage Data</LegalSubheading>
        <LegalList items={["App interactions", "Device/browser data"]} />

        <LegalSubheading>3.4 AI Inputs (if applicable)</LegalSubheading>
        <LegalList items={["Text inputs submitted to AI features", "Generated outputs"]} />
      </LegalSection>

      <LegalSection title="4. Legal Basis for Processing">
        <p>We process your data under:</p>
        <LegalList items={["Contract", "Legitimate interest", "Legal obligation", "Consent"]} />
      </LegalSection>

      <LegalSection title="5. How We Use Your Data">
        <p>We use your data to:</p>
        <LegalList
          items={[
            "Provide app functionality",
            "Store financial records",
            "Improve features",
            "Provide AI features",
            "Ensure security",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Data Storage and Security">
        <p>Your data is stored using Supabase.</p>
        <p>We use encryption and access controls, but no system is 100% secure.</p>
      </LegalSection>

      <LegalSection title="7. Data Sharing">
        <p>We do not sell your data.</p>
        <p>We may share data with:</p>
        <LegalList items={["Supabase", "Vercel", "Stripe", "Legal authorities if required"]} />
      </LegalSection>

      <LegalSection title="8. International Transfers">
        <p>Your data may be processed outside the EU with appropriate safeguards.</p>
      </LegalSection>

      <LegalSection title="9. Data Retention">
        <p>We keep data as long as your account is active or required by law.</p>
      </LegalSection>

      <LegalSection title="10. Your Rights (GDPR)">
        <p>You have the right to:</p>
        <LegalList
          items={[
            "Access",
            "Correction",
            "Deletion",
            "Restriction",
            "Portability",
            "Objection",
          ]}
        />
        <p>
          Contact: <LegalEmailLink />
        </p>
      </LegalSection>

      <LegalSection title="11. Cookies">
        <p>We may use essential cookies for authentication.</p>
      </LegalSection>

      <LegalSection title="12. Third-Party Services">
        <p>We use Supabase, Vercel, Stripe, and AI providers.</p>
      </LegalSection>

      <LegalSection title="13. Children's Privacy">
        <p>Not intended for users under 16.</p>
      </LegalSection>

      <LegalSection title="14. Changes">
        <p>We may update this policy.</p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          Email: <LegalEmailLink />
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
