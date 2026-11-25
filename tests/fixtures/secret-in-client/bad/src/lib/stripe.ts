import Stripe from "stripe";
const key = "__STRIPE_LIVE__";
export const stripe = new Stripe(key);
