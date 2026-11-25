import { verify } from '../../../../lib/stripe';
export async function POST(req: Request) {
  const event = await verify(req);
  if (event.type === 'checkout.session.completed') {}
  return new Response('ok');
}
