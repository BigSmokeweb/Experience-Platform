import { NextRequest, NextResponse } from 'next/server';

const NUGEN_API_KEY = process.env.NUGEN_API_KEY ?? '';
const NUGEN_MODEL = 'nugen-c2c1fad10e630972';
const NUGEN_BASE_URL = 'https://platform.nugen.in/api/v3/inference/chat/completions';

const SYSTEM_PROMPT = `You are Nugen, an AI concierge for a curated heritage travel platform specializing in authentic cultural experiences across Mumbai, Thane, and Navi Mumbai, India.

You help users discover:
- Hidden culinary trails and food experiences
- Artisan masterclasses and craft workshops
- Heritage walks and cultural routes
- Dawn access to local markets and fishing docks
- Sacred shrines, temples, and historical sites
- Sustainable and authentic local experiences

Keep responses concise (2-3 sentences), warm, and knowledgeable. Always suggest relevant experiences and guide users toward booking or exploring the platform. If asked about something outside travel/experiences, redirect gracefully back to heritage travel in the Mumbai Metropolitan Region.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history ?? []),
      { role: 'user', content: message },
    ];

    const nugenRes = await fetch(NUGEN_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NUGEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: NUGEN_MODEL,
        messages,
        max_tokens: 256,
        temperature: 0.7,
      }),
    });

    if (!nugenRes.ok) {
      const errText = await nugenRes.text();
      console.error('[nugen-chat] NuGen API error:', nugenRes.status, errText);
      return NextResponse.json({ error: 'NuGen API error', detail: errText }, { status: nugenRes.status });
    }

    const data = await nugenRes.json();
    const reply = data?.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[nugen-chat] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
