const CODE = /\.(?:js|jsx|mjs|cjs|ts|tsx|py|rb|go|php)$/;
const STRIPE_EVENT = /checkout\.session\.completed|invoice\.(?:paid|payment_succeeded)|customer\.subscription\.|payment_intent\.succeeded|stripe-signature/i;

export default {
  id: 'stripe-webhook-unverified',
  title: 'Stripe webhook without signature check',
  category: 'security',
  severity: 'critical',
  check(project) {
    return project.files
      .filter((f) => CODE.test(f))
      .filter((f) => {
        const text = project.read(f);
        const isWebhook = (/webhook/i.test(f) && /stripe/i.test(f + text)) || STRIPE_EVENT.test(text);
        return isWebhook && !/construct_?event/i.test(text);
      })
      .map((file) => ({
        file,
        message: 'This Stripe webhook handler never verifies the signature, so anyone can POST a fake "payment succeeded" event.',
        fix: 'Read the raw body and call `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)` before trusting the event.',
      }));
  },
};
