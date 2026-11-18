import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import type { AccountAiContext, PlannerSnapshot } from './src/types/stall';
import { applyAiToolAction } from './src/utils/aiActions';
import { buildVoiceCoachSystemInstruction, STALL_TOOL_DECLARATIONS } from './src/server/stallTools';
import {
  handleCfoAudit,
  handleGenerateConceptImage,
  handleParseCommand,
  handleParseRawStock,
  handleSearchStrategies,
  handleStrategyPitch,
  handleVoiceTurn,
} from './src/server/aiHandlers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      mode: isProd ? 'production' : 'development',
    });
  });

  app.get('/api/ai/health', (_req, res) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      runtime: 'express',
    });
  });

  const sendError = (res: express.Response, err: unknown, fallback: string) => {
    const status =
      typeof (err as { status?: unknown })?.status === 'number'
        ? (err as { status: number }).status
        : 500;
    const message = err instanceof Error ? err.message : fallback;
    res.status(status).json({ error: message });
  };

  app.post('/api/ai/parse-command', async (req, res) => {
    try {
      const data = await handleParseCommand(req.body);
      res.json(data);
    } catch (err) {
      sendError(res, err, 'Failed to parse command');
    }
  });

  app.post('/api/ai/parse-raw-stock', async (req, res) => {
    try {
      const data = await handleParseRawStock(req.body);
      res.json(data);
    } catch (err) {
      sendError(res, err, 'Failed to parse raw stock');
    }
  });

  app.post('/api/ai/cfo-audit', async (req, res) => {
    try {
      const data = await handleCfoAudit(req.body);
      res.json(data);
    } catch (err) {
      sendError(res, err, 'Failed to generate CFO audit');
    }
  });

  app.post('/api/ai/strategy', async (req, res) => {
    try {
      const data = await handleStrategyPitch(req.body);
      res.json(data);
    } catch (err) {
      sendError(res, err, 'Failed to generate strategy');
    }
  });

  app.post('/api/ai/search-strategies', async (req, res) => {
    try {
      const data = await handleSearchStrategies(req.body);
      res.json(data);
    } catch (err) {
      sendError(res, err, 'Failed to search strategies');
    }
  });

  app.post('/api/ai/generate-image', async (req, res) => {
    try {
      const data = await handleGenerateConceptImage(req.body);
      res.json(data);
    } catch (err) {
      sendError(res, err, 'Failed to generate display visual');
    }
  });

  app.post('/api/ai/voice-turn', async (req, res) => {
    try {
      const data = await handleVoiceTurn(req.body);
      res.json(data);
    } catch (err) {
      sendError(res, err, 'Failed to process voice coach turn');
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // WebSocket bridge for Gemini Live API (gemini-3.8-live)
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: WebSocket, req) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not set on server.' }));
      clientWs.close();
      return;
    }

    const url = new URL(req.url || '/live', `http://${req.headers.host || 'localhost'}`);
    const contextSummary = url.searchParams.get('context') || 'All-scale exhibition & retail jewellery planner';
    let liveAccountContext: AccountAiContext | undefined;
    const rawAccountParam = url.searchParams.get('account');
    if (rawAccountParam) {
      try {
        liveAccountContext = JSON.parse(rawAccountParam) as AccountAiContext;
      } catch {
        liveAccountContext = undefined;
      }
    }

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    let setupReady = false;
    let clientClosed = false;
    let liveState: PlannerSnapshot | null = null;
    const pendingClientMessages: string[] = [];

    const flushMessageToLive = (rawStr: string) => {
      if (!liveSession || clientClosed) return;
      try {
        const msg = JSON.parse(rawStr);
        if (msg.stateSync || msg.accountContext) {
          if (msg.stateSync) liveState = msg.stateSync as PlannerSnapshot;
          if (msg.accountContext) liveAccountContext = msg.accountContext as AccountAiContext;
          return;
        }
        if (msg.audio) {
          liveSession.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.text) {
          liveSession.sendRealtimeInput({ text: msg.text });
        }
      } catch {
        // Ignore malformed audio/text packets
      }
    };

    try {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: STALL_TOOL_DECLARATIONS }],
          systemInstruction: `${buildVoiceCoachSystemInstruction(undefined, liveAccountContext)}\nInitial summary: ${contextSummary}`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientClosed || clientWs.readyState !== WebSocket.OPEN) return;

            if (message.toolCall?.functionCalls?.length && liveSession) {
              const functionResponses = message.toolCall.functionCalls.map((call) => {
                if (!liveState) {
                  return {
                    id: call.id,
                    name: call.name,
                    response: { ok: false, error: 'Live workspace state is still syncing.' },
                  };
                }
                const exec = applyAiToolAction(
                  liveState,
                  call.name || 'get_live_plan_summary',
                  (call.args || {}) as Record<string, unknown>,
                  liveAccountContext
                );
                if (call.name === 'save_ai_memory') {
                  if (exec.memoryAdditions.length > 0) {
                    clientWs.send(
                      JSON.stringify({
                        memoryAdditions: exec.memoryAdditions,
                        appliedChanges: exec.changes,
                      })
                    );
                  }
                } else if (call.name !== 'get_live_plan_summary') {
                  liveState = exec.nextState;
                  clientWs.send(
                    JSON.stringify({
                      appStateUpdate: exec.nextState,
                      appliedChanges: exec.changes,
                    })
                  );
                }
                return {
                  id: call.id,
                  name: call.name,
                  response: exec.toolResponse,
                };
              });

              liveSession.sendToolResponse({ functionResponses });
            }

            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onerror: (err) => {
            if (!clientClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err?.message || 'Live session error' }));
            }
          },
          onclose: () => {
            if (!clientClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.close();
            }
          },
        },
      });

      if (clientClosed) {
        try {
          liveSession.close();
        } catch {
          // Ignore close cleanup
        }
        return;
      }

      // Flush any messages buffered before connect() resolved, then signal client ready
      setupReady = true;
      while (pendingClientMessages.length > 0) {
        const queued = pendingClientMessages.shift();
        if (queued) flushMessageToLive(queued);
      }
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ ready: true }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to Gemini Live API';
      if (!clientClosed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: msg }));
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      if (clientClosed) return;
      const rawStr = raw.toString();
      try {
        const parsed = JSON.parse(rawStr);
        if (parsed.stateSync || parsed.accountContext) {
          if (parsed.stateSync) liveState = parsed.stateSync as PlannerSnapshot;
          if (parsed.accountContext) liveAccountContext = parsed.accountContext as AccountAiContext;
          return;
        }
      } catch {
        // Ignore parse error on non-JSON control frame
      }
      if (!setupReady) {
        pendingClientMessages.push(rawStr);
        return;
      }
      flushMessageToLive(rawStr);
    });

    clientWs.on('close', () => {
      clientClosed = true;
      try {
        liveSession?.close();
      } catch {
        // Ignore close cleanup errors
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`StallIQ Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
