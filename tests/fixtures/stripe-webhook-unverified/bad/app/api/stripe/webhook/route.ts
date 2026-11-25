export async function POST(req: Request) {
  const event = await req.json();
  if (event.type === 'checkout.session.completed') {
    // grant access
  }
  return new Response('ok');
}
