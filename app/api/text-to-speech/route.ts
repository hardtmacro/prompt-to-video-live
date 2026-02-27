import { NextResponse } from 'next/server';

// Deepgram Aura-2 voices via Cloudflare Workers AI.
// voiceId is the voice name, e.g. 'asteria-en', 'zeus-en', 'luna-en'.
// Full list: asteria-en, luna-en, zeus-en, orion-en, aurora-en, athena-en,
//   draco-en, hera-en, hermes-en, iris-en, orpheus-en, pandora-en, phoebe-en,
//   arcas-en, apollo-en, andromeda-en, cordelia-en, jupiter-en, mars-en, vesta-en

export async function POST(request: Request) {
  try {
    const { text, voiceId = 'asteria-en' } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json({ fallback: true });
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/deepgram/aura-2-${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ fallback: true });
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ fallback: true });
  }
}
