import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['Grass', 'Water', 'Fire', 'Bug', 'Poison', 'Normal', 'Flying'] as const;
type CardType = (typeof ALLOWED_TYPES)[number];

interface MonsterCardPayload {
  monsterName: string;
  realSpecies: string;
  type: CardType;
  hp: number;
  skill: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Runtime schema validation
// ---------------------------------------------------------------------------

function validateCard(raw: Record<string, unknown>): MonsterCardPayload {
  const { monsterName, realSpecies, type, hp, skill, description } = raw;

  if (typeof monsterName !== 'string' || !monsterName) throw new Error('Invalid monsterName');
  if (typeof realSpecies !== 'string' || !realSpecies) throw new Error('Invalid realSpecies');
  if (typeof skill !== 'string' || !skill) throw new Error('Invalid skill');
  if (typeof description !== 'string' || !description) throw new Error('Invalid description');

  const hpNum = typeof hp === 'string' ? parseInt(hp, 10) : hp;
  if (typeof hpNum !== 'number' || isNaN(hpNum) || hpNum < 10 || hpNum > 120)
    throw new Error(`Invalid hp: ${hp}`);

  if (!ALLOWED_TYPES.includes(type as CardType)) throw new Error(`Invalid type: ${type}`);

  return {
    monsterName,
    realSpecies,
    type: type as CardType,
    hp: Math.round(hpNum),
    skill,
    description,
  };
}

function parseAIResponse(text: string): MonsterCardPayload {
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return validateCard(JSON.parse(cleaned) as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// System prompt (shared across all providers)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are a Pokedex system analyzing local wildlife. Analyze the provided image and respond ONLY with a valid JSON object matching this exact schema:\n' +
  '{\n' +
  '  "monsterName": "A cool creative monster name based on the photo",\n' +
  '  "realSpecies": "Biological/common name of the animal or plant",\n' +
  '  "type": "Choose one from [Grass, Water, Fire, Bug, Poison, Normal, Flying]",\n' +
  '  "hp": 85,\n' +
  '  "skill": "One attack or passive skill based on its real behavior",\n' +
  '  "description": "Brief 1-sentence description in fun Pokemon-style lore"\n' +
  '}';

// ---------------------------------------------------------------------------
// Provider: Google Gemini
// Uses: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
// Supports: gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro, etc.
// ---------------------------------------------------------------------------

async function callGemini(
  base64: string,
  mimeType: string,
  model: string,
  apiKey: string,
): Promise<MonsterCardPayload> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            { text: 'Analyze this wildlife photo and return the JSON card.' },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const err = (await response.text()).slice(0, 200);
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };

  const rawText = data.candidates[0].content.parts[0].text;
  return parseAIResponse(rawText);
}

// ---------------------------------------------------------------------------
// Provider: OpenRouter (OpenAI-compatible, also works for Together AI / Groq)
// ---------------------------------------------------------------------------

async function callOpenRouter(
  base64: string,
  mimeType: string,
  apiKey: string,
): Promise<MonsterCardPayload> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://fauna-dex.app',
      'X-Title': 'Fauna-Dex',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.2-11b-vision-instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: 'Analyze this wildlife photo and return the JSON card.' },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return parseAIResponse(data.choices[0].message.content);
}

// ---------------------------------------------------------------------------
// Mock fallback (no API key set)
// ---------------------------------------------------------------------------

const MOCK_NAMES = ['Fernoviper', 'Mossquatch', 'Thornbeetle', 'Gloomheron', 'Spindlefox'];
const MOCK_SPECIES = [
  'Unknown Flora',
  'Unidentified Insect',
  'Wild Canid',
  'Migratory Bird',
  'Garden Spider',
];

function mockCard(): MonsterCardPayload {
  const idx = Math.floor(Math.random() * MOCK_NAMES.length);
  const types: CardType[] = ['Grass', 'Water', 'Fire', 'Bug', 'Poison', 'Normal', 'Flying'];
  return {
    monsterName: MOCK_NAMES[idx],
    realSpecies: MOCK_SPECIES[idx],
    type: types[Math.floor(Math.random() * types.length)],
    hp: Math.floor(Math.random() * 110) + 10,
    skill: 'Camouflage — blends into surroundings to avoid detection',
    description:
      'A mysterious creature lurking in the undergrowth, catalogued by a lone explorer with no signal.',
  };
}

// ---------------------------------------------------------------------------
// Route handler
// Priority: GEMINI_API_KEY → OPENROUTER_API_KEY → mock
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { image } = (await request.json()) as { image: string };

    // Extract MIME type and raw base64 from data URI
    const mimeMatch = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64 = mimeMatch ? image.slice(mimeMatch[0].length) : image;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // 1. Gemini (preferred if key is set)
    if (geminiKey) {
      const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
      const card = await callGemini(base64, mimeType, geminiModel, geminiKey);
      return NextResponse.json(card);
    }

    // 2. OpenRouter fallback
    if (openrouterKey) {
      const card = await callOpenRouter(base64, mimeType, openrouterKey);
      return NextResponse.json(card);
    }

    // 3. Mock — no keys configured
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json(mockCard());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
