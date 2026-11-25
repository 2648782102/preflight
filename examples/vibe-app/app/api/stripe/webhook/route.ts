export async function POST(req: Request) {
  const event = await req.json();
  if (event.type === 'checkout.session.completed') {
    // TODO: mark the user as paid
  }
  return new Response('ok');
}
