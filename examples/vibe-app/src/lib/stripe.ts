// Demo only: this key is fake and assembled at runtime by vibe-preflight --demo.
import Stripe from 'stripe';
export const stripe = new Stripe('__STRIPE_LIVE__');
