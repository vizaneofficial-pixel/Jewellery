import { GoogleGenAI, ThinkingLevel, Type, type Content } from '@google/genai';
import type { AccountAiContext, AiMemoryAddition, PlannerSnapshot } from '../types/stall';
import { applyAiToolAction } from '../utils/aiActions';
import {
  buildVoiceCoachSystemInstruction,
  formatAccountContextBlock,
  STALL_TOOL_DECLARATIONS,
} from './stallTools';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Vercel Project Settings → Environment Variables (or your local Secrets/.env) and redeploy.'
    );
    (err as Error & { status?: number }).status = 500;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, delays = [800, 1800]): Promise<T> {
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === delays.length) throw err;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw new Error('Retry exhausted');
}

function normalizeGeminiError(err: unknown): Error & { status?: number } {
  const rawMsg = err instanceof Error ? err.message : String(err || 'AI request failed');
  let cleanMsg = rawMsg;
  let status = (err as { status?: number })?.status;

  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed?.error?.message) {
      cleanMsg = parsed.error.message;
      if (typeof parsed.error.code === 'number') status = parsed.error.code;
    }
  } catch {
    // Raw message is already plain text
  }

  if (cleanMsg.includes('RESOURCE_EXHAUSTED') || status === 429) {
    cleanMsg =
      'Gemini API rate/quota limit reached for this feature right now. Please retry in a few seconds or verify your billing/quota in Google AI Studio.';
    status = 429;
  } else if (status === 503 || cleanMsg.includes('high demand')) {
    cleanMsg = 'Gemini AI is experiencing a temporary traffic spike. Please retry in a moment.';
    status = 503;
  }

  const out = new Error(cleanMsg) as Error & { status?: number };
  out.status = status || 500;
  return out;
}

function isTransientOverload(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  const status = (err as { status?: number })?.status;
  return (
    status === 503 ||
    status === 429 ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

export async function handleParseCommand(body: {
  input: string;
  categories: Array<{ name: string; cost: number; price: number; beauty: number }>;
  settings: {
    eventName?: string;
    expectedFootfall?: number;
    budgetCap: number;
    minProfitFloor: number;
    stallFee: number;
    maxPerCategory: number;
  };
  accountContext?: AccountAiContext;
}) {
  const ai = getAiClient();
  const sysPrompt = `You are the low-latency command parser for StallIQ Pro, an all-scale retail & jewellery stall optimizer.
${formatAccountContextBlock(body.accountContext)}
Current categories: ${JSON.stringify(body.categories)}.
Current settings: ${JSON.stringify(body.settings)}.
Convert the user's raw note, dictated items, supplier quote, sale scale change, or rule request into structured updates. Only populate memoryNotes when the user states a durable preference, product category focus, price sensitivity, goal, or explicitly confirmed fact to remember (never store raw command transcripts). Return ONLY fields that should be updated or added, plus a concise 1-sentence summaryMessage.`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: body.input,
        config: {
          systemInstruction: sysPrompt,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              eventName: { type: Type.STRING },
              expectedFootfall: { type: Type.NUMBER },
              budgetCap: { type: Type.NUMBER },
              minProfitFloor: { type: Type.NUMBER },
              stallFee: { type: Type.NUMBER },
              maxPerCategory: { type: Type.NUMBER },
              allAtLeastOne: { type: Type.BOOLEAN },
              evenDistribution: { type: Type.BOOLEAN },
              beautyFirst: { type: Type.BOOLEAN },
              maxProfitFocus: { type: Type.BOOLEAN },
              safe90Mode: { type: Type.BOOLEAN },
              replaceCategories: { type: Type.BOOLEAN },
              categoryUpdates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    cost: { type: Type.NUMBER },
                    price: { type: Type.NUMBER },
                    beauty: { type: Type.NUMBER },
                    isNewBangleCategory: { type: Type.BOOLEAN },
                  },
                },
              },
              stallStockAdditions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    cost: { type: Type.NUMBER },
                    price: { type: Type.NUMBER },
                    qty: { type: Type.NUMBER },
                    sellThrough: { type: Type.NUMBER },
                  },
                },
              },
              memoryNotes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fact: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                },
              },
              summaryMessage: { type: Type.STRING },
            },
          },
        },
      })
    );

    return JSON.parse((response.text ?? '{}').trim());
  } catch (err) {
    throw normalizeGeminiError(err);
  }
}

export async function handleParseRawStock(body: { rawNotes: string; defaultSellThrough: number }) {
  const ai = getAiClient();
  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: body.rawNotes,
        config: {
          systemInstruction: `Extract messy supplier bills, WhatsApp stock lists, or rough notes into clean stall inventory rows for an Indian jewellery exhibition stall. Estimate missing sell price at 2.5x–3x wholesale cost if omitted, and default sellThrough to ${body.defaultSellThrough || 85}.`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    cost: { type: Type.NUMBER },
                    price: { type: Type.NUMBER },
                    qty: { type: Type.NUMBER },
                    sellThrough: { type: Type.NUMBER },
                  },
                  required: ['name', 'category', 'cost', 'price', 'qty', 'sellThrough'],
                },
              },
              note: { type: Type.STRING },
            },
          },
        },
      })
    );

    return JSON.parse((response.text ?? '{"items":[]}').trim());
  } catch (err) {
    throw normalizeGeminiError(err);
  }
}

export async function handleCfoAudit(body: {
  eventName?: string;
  stallFee: number;
  expectedFootfall: number;
  accountContext?: AccountAiContext;
  totals: {
    totalCost: number;
    totalOutlay: number;
    revRealistic: number;
    netAfterStallReal: number;
    unitsToBreakEven: number;
    footfallConversionNeeded: number;
    blendedMarginPct: number;
    rentBurdenPct: number;
  };
  items: Array<{
    name: string;
    category: string;
    cost: number;
    price: number;
    qty: number;
    sellThrough: number;
    lineProfitReal: number;
    roiPct: number;
  }>;
}) {
  const ai = getAiClient();
  const eventLabel = body.eventName || 'Retail Pop-Up / Exhibition';
  const contents = `Audit this jewellery stall inventory and financial structure for ${eventLabel}:\nTotals: ${JSON.stringify(
    body.totals
  )}\nStall/Event Fee: ₹${body.stallFee}\nExpected Footfall: ${body.expectedFootfall}\nLine Items: ${JSON.stringify(
    body.items
  )}`;
  const sysInstr = `You are a senior retail CFO advising an Indian jewellery merchant running "${eventLabel}" (${body.expectedFootfall.toLocaleString(
    'en-IN'
  )} expected footfall).
${formatAccountContextBlock(body.accountContext)}
Deliver a crisp, numbers-backed audit in 4 short bullet points covering: (1) Margin & ROI winner to spotlight, (2) Dead-stock / over-stocked risk, (3) Bundle pricing move to lift average bill value, and (4) Break-even pacing target across sale hours. Address the merchant naturally by their Preferred Name if provided and tailor recommendations to their saved preferences. Keep total response under 150 words, crisp and scannable.`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction: sysInstr,
        },
      })
    );
    return { audit: response.text ?? '' };
  } catch (err) {
    if (isTransientOverload(err)) {
      try {
        const fallback = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: { systemInstruction: sysInstr },
        });
        return { audit: fallback.text ?? '' };
      } catch (fbErr) {
        throw normalizeGeminiError(fbErr);
      }
    }
    throw normalizeGeminiError(err);
  }
}

export async function handleStrategyPitch(body: {
  eventName?: string;
  expectedFootfall?: number;
  question: string;
  activeMixSummary: string;
  stallFee: number;
  accountContext?: AccountAiContext;
}) {
  const ai = getAiClient();
  const eventLabel = body.eventName || 'Exhibition / Pop-Up';
  const contents = `Event: ${eventLabel} (${(body.expectedFootfall || 10000).toLocaleString(
    'en-IN'
  )} footfall)\nActive Mix: ${body.activeMixSummary}\nStall Fee: ₹${body.stallFee}\nMerchant Question: ${body.question}`;
  const sysInstr = `You are a top Indian retail merchandiser and sales trainer advising for "${eventLabel}".
${formatAccountContextBlock(body.accountContext)}
Provide a sharp, ready-to-use 3-step selling script, bundle price anchor, and objection-handling line tailored to the merchant inventory, sale scale, and private account context (using their Preferred Name naturally if provided). Keep it under 120 words and scannable.`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: { systemInstruction: sysInstr },
      })
    );
    return { strategy: response.text ?? '' };
  } catch (err) {
    if (isTransientOverload(err)) {
      try {
        const fallback = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: { systemInstruction: sysInstr },
        });
        return { strategy: fallback.text ?? '' };
      } catch (fbErr) {
        throw normalizeGeminiError(fbErr);
      }
    }
    throw normalizeGeminiError(err);
  }
}

export async function handleSearchStrategies(body: { query: string }) {
  const ai = getAiClient();
  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Find current practical ideas, display trends, pricing tips, and YouTube video guides for: ${body.query}. Summarize 3 actionable takeaways concisely.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      })
    );

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks
      .map((c) => c.web)
      .filter((w): w is { uri: string; title: string } => Boolean(w?.uri && w?.title))
      .slice(0, 6);

    return {
      summary: response.text ?? '',
      sources,
    };
  } catch (err) {
    throw normalizeGeminiError(err);
  }
}

export async function handleGenerateConceptImage(body: { prompt?: string }) {
  const ai = getAiClient();
  const prompt =
    body.prompt?.trim() ||
    'A luxury aesthetic pop-up jewellery exhibition stall tabletop display in India featuring glossy colourful resin bangles, white statement bangles on dark velvet cones, hammered cuffs beside a brass mirror, wooden stacker bangles, and warm golden gallery lighting, photorealistic retail merchandising, 8k quality';

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '4:3',
          },
        },
      })
    );

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'image/png';
        return { imageUrl: `data:${mime};base64,${part.inlineData.data}` };
      }
    }

    throw new Error('Image model did not return an image part.');
  } catch (err) {
    throw normalizeGeminiError(err);
  }
}

export async function handleVoiceTurn(body: {
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  contextSummary?: string;
  plannerState?: PlannerSnapshot;
  accountContext?: AccountAiContext;
  history?: Array<{ role: 'user' | 'coach'; text: string }>;
  wantAudioReply?: boolean;
}) {
  const ai = getAiClient();
  let userTranscript = body.text?.trim() || '';

  if (!userTranscript && body.audioBase64) {
    const mimeType = body.mimeType || 'audio/webm';
    const transcribeRes = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            { inlineData: { mimeType, data: body.audioBase64 as string } },
            {
              text: 'Transcribe this spoken dictation or question from an Indian retail/jewellery merchant in English or Hinglish. Preserve all item names, beauty scores, costs, prices, and budgets accurately.',
            },
          ],
        },
      })
    );
    userTranscript = (transcribeRes.text ?? '').trim();
  }

  if (!userTranscript) {
    return {
      userTranscript: '',
      coachText:
        "I didn't catch clear speech in that clip. Try speaking a bit closer to your mic or type your items/question below.",
      audioWavBase64: null as string | null,
      updatedState: null as PlannerSnapshot | null,
      appliedChanges: [] as string[],
      memoryAdditions: [] as AiMemoryAddition[],
    };
  }

  const recentHistory = (body.history ?? [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Merchant' : 'Coach'}: ${m.text}`)
    .join('\n');

  const prompt = recentHistory
    ? `Recent conversation:\n${recentHistory}\n\nMerchant's new message: ${userTranscript}`
    : `Merchant's message: ${userTranscript}`;

  const sysInstr = body.plannerState
    ? buildVoiceCoachSystemInstruction(body.plannerState, body.accountContext)
    : `You are StallIQ Voice Coach, a practical, upbeat retail mentor. Context: ${
        body.contextSummary || 'All-scale retail jewellery planner'
      }.\n${formatAccountContextBlock(body.accountContext)}\nKeep spoken answers crisp (2-4 sentences), natural for voice playback without markdown bullets or asterisks.`;

  let currentState: PlannerSnapshot | undefined = body.plannerState;
  let stateChanged = false;
  const appliedChanges: string[] = [];
  const memoryAdditions: AiMemoryAddition[] = [];
  const conversation: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];

  let coachText = '';

  const generateWithFallback = async (contents: Content[], useHydrogen: boolean) => {
    const config = {
      systemInstruction: sysInstr,
      ...(currentState ? { tools: [{ functionDeclarations: STALL_TOOL_DECLARATIONS }] } : {}),
      ...(useHydrogen ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
    };
    return ai.models.generateContent({
      model: useHydrogen ? 'gemini-4-hydrogen' : 'gemini-3.1-flash-lite',
      contents,
      config,
    });
  };

  try {
    let useHydrogen = true;

    for (let round = 0; round < 3; round++) {
      let res;
      try {
        res = await withRetry(() => generateWithFallback(conversation, useHydrogen));
      } catch (err) {
        if (useHydrogen && isTransientOverload(err)) {
          useHydrogen = false;
          res = await generateWithFallback(conversation, false);
        } else {
          throw err;
        }
      }

      const calls = res.functionCalls;
      if (calls && calls.length > 0 && currentState) {
        const modelContent = res.candidates?.[0]?.content;
        if (modelContent) {
          conversation.push(modelContent);
        }

        const fnParts = calls.map((call) => {
          const exec = applyAiToolAction(
            currentState as PlannerSnapshot,
            call.name || 'get_live_plan_summary',
            (call.args || {}) as Record<string, unknown>,
            body.accountContext
          );
          if (call.name === 'save_ai_memory') {
            memoryAdditions.push(...exec.memoryAdditions);
            appliedChanges.push(...exec.changes);
          } else if (call.name !== 'get_live_plan_summary') {
            currentState = exec.nextState;
            stateChanged = true;
            appliedChanges.push(...exec.changes);
          }
          return {
            functionResponse: {
              id: call.id,
              name: call.name || 'get_live_plan_summary',
              response: exec.toolResponse,
            },
          };
        });

        conversation.push({ role: 'user', parts: fnParts });
        continue;
      }

      coachText = (res.text ?? '').trim();
      break;
    }
  } catch (err) {
    throw normalizeGeminiError(err);
  }

  let audioWavBase64: string | null = null;

  if (coachText && body.wantAudioReply !== false) {
    try {
      const ttsRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: coachText,
                speechMetadata: {
                  style: 'Upbeat, warm, practical Indian retail mentor',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });
      audioWavBase64 =
        ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
    } catch {
      audioWavBase64 = null;
    }
  }

  return {
    userTranscript,
    coachText,
    audioWavBase64,
    updatedState: stateChanged && currentState ? currentState : null,
    appliedChanges,
    memoryAdditions,
  };
}


