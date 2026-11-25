const CODE = /\.(?:js|jsx|mjs|cjs|ts|tsx|py|rb|go|php)$/;
const STRIPE_EVENT = /checkout\.session\.completed|invoice\.(?:paid|payment_succeeded)|customer\.subscription\.|payment_intent\.succeeded/;
const HANDLER = /export\s+(?:async\s+)?(?:function\s+POST|const\s+POST)|\b(?:app|router|server)\.post\(|@app\.(?:post|route)\(|stripe-signature|def\s+\w*webhook/i;
const VERIFIED = /construct_?event/i;

export default {
  id: 'stripe-webhook-unverified',
  title: 'Stripe webhook without signature check',
  category: 'security',
  severity: 'critical',
  check(project) {
    const code = project.files.filter((f) => CODE.test(f));
    // A project that verifies anywhere (often in a shared helper) is treated as verified.
    if (code.some((f) => VERIFIED.test(project.read(f)))) return [];
    return code
      .filter((f) => {
        const text = project.read(f);
        return HANDLER.test(text) && STRIPE_EVENT.test(text);
      })
      .map((file) => ({
        file,
        message: 'This Stripe webhook handler never verifies the signature, so anyone can POST a fake "payment succeeded" event.',
        fix: 'Read the raw body and call `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)` before trusting the event.',
      }));
  },
};
