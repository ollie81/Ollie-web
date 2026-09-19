import LegalPage, { Bullet, Paragraph, Section } from '../components/LegalPage';

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <Paragraph>
        This policy explains what Ollie collects, why, and how you can control it. Ollie is an AI companion app — it
        uses AI models to hold conversations, remember things you tell it, and reply as a real voice when you use
        voice features.
      </Paragraph>

      <Section title="Information we collect">
        <Bullet>
          Account info: your email address (via Google Sign-In or email/password), a hashed password if you sign up
          with email (we never store your actual password), and optionally your date of birth (used only to confirm
          you meet the minimum age) and country.
        </Bullet>
        <Bullet>
          Conversations: the messages you send Ollie, Ollie's replies, and things Ollie infers from those
          conversations to remember you better — interests, mood patterns, goals you mention, and events you ask to
          be reminded about.
        </Bullet>
        <Bullet>
          Voice: if you use voice features, your recording is sent to our transcription and text-to-speech providers
          to process your message and generate Ollie's spoken reply. We don't keep a copy of the audio itself once
          it's processed.
        </Bullet>
        <Bullet>
          Usage & subscription info: how many messages you've sent, whether you have an active subscription, and —
          if you subscribe — the purchase information Lemon Squeezy gives us to confirm and manage that subscription.
        </Bullet>
      </Section>

      <Section title="Automatic safety checks">
        <Bullet>
          Messages are automatically screened for signs of self-harm, abuse, or other crisis situations, and for
          content that violates our usage policies. This happens on every message, whether or not anything is
          flagged.
        </Bullet>
        <Bullet>
          If a message is flagged, that's recorded (the message and a timestamp) so it can be reviewed. Flagging
          never blocks your conversation — Ollie still replies normally, and (for crisis-related flags) includes a
          resource line alongside its normal reply.
        </Bullet>
      </Section>

      <Section title="How we use this information">
        <Bullet>To run the core app: hold a conversation, remember context between sessions, and generate voice replies.</Bullet>
        <Bullet>To personalize Ollie's responses based on what you've told it.</Bullet>
        <Bullet>To enforce free-tier limits and manage premium subscriptions.</Bullet>
        <Bullet>To monitor for safety issues as described above.</Bullet>
      </Section>

      <Section title="Third parties we share data with">
        <Bullet>OpenAI — processes your messages to generate Ollie's replies, transcribes voice messages, and runs the automatic safety screening.</Bullet>
        <Bullet>Papla Media — converts Ollie's replies to spoken audio for voice features.</Bullet>
        <Bullet>SendGrid — sends the one-time codes used to verify your email address.</Bullet>
        <Bullet>Google — Sign-In, if you use it to log in.</Bullet>
        <Bullet>Lemon Squeezy — our Merchant of Record for premium subscriptions. It's the legal seller on every purchase and processes your payment; we never see your card details.</Bullet>
        <Bullet>Supabase and Railway — host our database and backend infrastructure.</Bullet>
        <Bullet>
          Sentry — helps us catch and fix bugs when a request fails. It receives technical error details (like a
          stack trace), never your messages or account details.
        </Bullet>
        <Bullet>We don't sell your data, and we don't share it for third-party advertising.</Bullet>
      </Section>

      <Section title="Your choices">
        <Bullet>Clear Ollie's memory of you at any time from Settings — this erases what Ollie has learned about you (interests, patterns, things you've shared).</Bullet>
        <Bullet>Delete your account from Settings — this permanently removes your account and everything associated with it.</Bullet>
        <Bullet>Control how often Ollie checks in with you first, or turn it off, from Settings.</Bullet>
      </Section>

      <Section title="Children's privacy">
        <Bullet>Ollie is not intended for children under 13, and we ask for a birthdate at signup to help enforce that minimum.</Bullet>
      </Section>

      <Section title="Security">
        <Bullet>
          Passwords are hashed, not stored in plain text. Access tokens are stored securely on your device. We use
          industry-standard practices to protect your data, but no system is 100% secure.
        </Bullet>
      </Section>

      <Section title="Changes to this policy">
        <Bullet>If this policy changes in a way that matters, we'll let you know in the app.</Bullet>
      </Section>

      <Section title="Contact us">
        <Bullet>Questions about this policy or your data: [add a real contact email before publishing].</Bullet>
      </Section>
    </LegalPage>
  );
}
