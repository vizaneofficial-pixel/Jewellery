import React, { useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Play,
  Send,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { AccountAiContext, AiMemoryAddition, PlannerSnapshot } from '../types/stall';
import {
  VoicePlaybackRegistry,
  VoiceTurnGate,
  shouldSuppressMicFrame,
} from '../utils/voiceAudioGuard';

interface VoiceCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextSummary: string;
  plannerSnapshot: PlannerSnapshot;
  accountContext?: AccountAiContext;
  onApplyAiState: (nextState: PlannerSnapshot, changes: string[]) => void;
  onMemoryAdditions?: (items: AiMemoryAddition[]) => void;
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'coach' | 'system';
  text: string;
  audioWavBase64?: string | null;
  changes?: string[];
}

function pcmFloatTo16BitBase64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToPcmFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

export function VoiceCoachModal({
  isOpen,
  onClose,
  contextSummary,
  plannerSnapshot,
  accountContext,
  onApplyAiState,
  onMemoryAdditions,
}: VoiceCoachModalProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [mode, setMode] = useState<'live-ws' | 'serverless'>('live-ws');
  const [minimized, setMinimized] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [echoShield, setEchoShield] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const modeRef = useRef<'live-ws' | 'serverless'>('live-ws');
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const snapshotRef = useRef<PlannerSnapshot>(plannerSnapshot);
  const accountContextRef = useRef<AccountAiContext | undefined>(accountContext);
  const onApplyRef = useRef(onApplyAiState);
  const onMemoryRef = useRef(onMemoryAdditions);
  const contextRef = useRef(contextSummary);
  const echoShieldRef = useRef(echoShield);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const playbackRegistryRef = useRef(new VoicePlaybackRegistry());
  const turnGateRef = useRef(new VoiceTurnGate());

  messagesRef.current = messages;
  modeRef.current = mode;
  snapshotRef.current = plannerSnapshot;
  accountContextRef.current = accountContext;
  onApplyRef.current = onApplyAiState;
  onMemoryRef.current = onMemoryAdditions;
  contextRef.current = contextSummary;
  echoShieldRef.current = echoShield;

  useEffect(() => {
    if (!minimized) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, processing, minimized]);

  const stopAllAudioPlayback = () => {
    const currentTime = outputCtxRef.current?.currentTime ?? 0;
    playbackRegistryRef.current.stopAll(currentTime);

    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
    } catch {
      // Ignore audio element pause errors
    }
    audioPlayerRef.current = null;

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore Web Speech cancel errors
    }
    setIsSpeaking(false);
  };

  const playWavClip = (base64Wav: string) => {
    try {
      stopAllAudioPlayback();
      const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
      audioPlayerRef.current = audio;
      setIsSpeaking(true);
      audio.onended = () => {
        if (audioPlayerRef.current === audio) {
          audioPlayerRef.current = null;
          setIsSpeaking(false);
        }
      };
      audio.onerror = () => {
        if (audioPlayerRef.current === audio) {
          audioPlayerRef.current = null;
          setIsSpeaking(false);
        }
      };
      audio.play().catch(() => {
        if (audioPlayerRef.current === audio) {
          audioPlayerRef.current = null;
          setIsSpeaking(false);
        }
      });
    } catch {
      setIsSpeaking(false);
    }
  };

  const speakBrowserVoice = (text: string) => {
    try {
      stopAllAudioPlayback();
      if (!('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.02;
      setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSession = () => {
    turnGateRef.current.invalidateAll();
    setMicActive(false);
    setProcessing(false);
    wsReadyRef.current = false;
    stopAllAudioPlayback();

    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      processorRef.current?.disconnect();
      gainNodeRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      inputCtxRef.current?.close();
      outputCtxRef.current?.close();
      if (wsRef.current) {
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    } catch {
      // Ignore audio cleanup errors
    }
    recorderRef.current = null;
    processorRef.current = null;
    gainNodeRef.current = null;
    streamRef.current = null;
    inputCtxRef.current = null;
    outputCtxRef.current = null;
    wsRef.current = null;
  };

  // Sync latest website snapshot and account memory whenever state updates while Live WS is active
  useEffect(() => {
    if (isOpen && mode === 'live-ws' && status === 'live' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          stateSync: plannerSnapshot,
          accountContext: accountContext || null,
        })
      );
    }
  }, [isOpen, mode, status, plannerSnapshot, accountContext]);

  // Connect WebSocket once when Voice Coach opens (never tear down on state updates)
  useEffect(() => {
    if (!isOpen) {
      stopSession();
      setStatus('idle');
      setMinimized(false);
      return;
    }

    const connGen = turnGateRef.current.nextConnection();
    let cancelled = false;
    const isStale = () => cancelled || !turnGateRef.current.isCurrentConnection(connGen);

    setStatus('connecting');
    setMode('live-ws');
    modeRef.current = 'live-ws';
    wsReadyRef.current = false;
    setErrorMsg(null);
    stopAllAudioPlayback();
    setMessages([
      {
        id: 'init',
        role: 'system',
        text: 'Connecting live AI co-pilot...',
      },
    ]);

    const activateServerlessFallback = () => {
      if (isStale() || wsReadyRef.current || modeRef.current === 'serverless') return;
      stopAllAudioPlayback();
      try {
        if (wsRef.current) {
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          wsRef.current.close();
        }
      } catch {
        // Ignore close errors
      }
      wsRef.current = null;
      modeRef.current = 'serverless';
      setMode('serverless');
      setStatus('live');
      setErrorMsg(null);
      const greetingName =
        accountContextRef.current?.preferredName ||
        accountContextRef.current?.displayName?.split(' ')[0] ||
        '';
      const namePrefix = greetingName ? `Hi ${greetingName} — ` : '';
      setMessages([
        {
          id: 'serverless_ready',
          role: 'coach',
          text: accountContextRef.current?.memories?.length
            ? `${namePrefix}Voice Coach ready with your private account memory (${accountContextRef.current.memories.length} notes). Read out items, beauty scores, or ask anything.`
            : `${namePrefix}Voice Coach ready (Audio + AI Plan Control). Read out items, beauty scores, costs & budget—I will build your plan live.`,
        },
      ]);
    };

    const fallbackTimer = window.setTimeout(activateServerlessFallback, 3200);

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const accountParam = accountContextRef.current
        ? `&account=${encodeURIComponent(
            JSON.stringify({
              ...accountContextRef.current,
              memories: accountContextRef.current.memories.slice(0, 12),
            })
          )}`
        : '';
      const wsUrl = `${proto}//${window.location.host}/live?context=${encodeURIComponent(
        contextRef.current
      )}${accountParam}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const outputCtx = AudioCtx ? new AudioCtx({ sampleRate: 24000 }) : null;
      outputCtxRef.current = outputCtx;

      ws.onmessage = (event) => {
        if (isStale() || modeRef.current !== 'live-ws') return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.ready) {
            window.clearTimeout(fallbackTimer);
            wsReadyRef.current = true;
            modeRef.current = 'live-ws';
            setMode('live-ws');
            setStatus('live');
            ws.send(
              JSON.stringify({
                stateSync: snapshotRef.current,
                accountContext: accountContextRef.current || null,
              })
            );
            const liveName =
              accountContextRef.current?.preferredName ||
              accountContextRef.current?.displayName?.split(' ')[0] ||
              '';
            const livePrefix = liveName ? `Hi ${liveName} — ` : '';
            setMessages([
              {
                id: `r_${Date.now()}`,
                role: 'coach',
                text: accountContextRef.current?.memories?.length
                  ? `${livePrefix}Live Voice Coach ready with ${accountContextRef.current.memories.length} remembered account note(s). Read out your items, beauty scores & budget.`
                  : `${livePrefix}Live Voice Coach ready. Read out your items, beauty scores, costs & budget—watch the site build your plan live.`,
              },
            ]);
          }
          if (Array.isArray(msg.memoryAdditions) && msg.memoryAdditions.length > 0) {
            onMemoryRef.current?.(msg.memoryAdditions as AiMemoryAddition[]);
            setMessages((prev) => [
              ...prev,
              {
                id: `mem_${Date.now()}`,
                role: 'system',
                text: `Saved to account memory: ${(msg.memoryAdditions as AiMemoryAddition[])
                  .map((m) => m.fact)
                  .slice(0, 2)
                  .join(' · ')}`,
              },
            ]);
          }
          if (msg.appStateUpdate) {
            onApplyRef.current(msg.appStateUpdate as PlannerSnapshot, msg.appliedChanges || []);
            if (Array.isArray(msg.appliedChanges) && msg.appliedChanges.length > 0) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `sys_${Date.now()}`,
                  role: 'system',
                  text: `Site updated: ${msg.appliedChanges.slice(0, 4).join(' · ')}`,
                  changes: msg.appliedChanges,
                },
              ]);
            }
          }
          if (msg.error) {
            if (!wsReadyRef.current) {
              activateServerlessFallback();
            } else {
              setStatus('error');
              setErrorMsg(msg.error);
            }
          }
          if (msg.inputTranscript) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'user' && last.id.startsWith('live_u_')) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text}${msg.inputTranscript}` },
                ];
              }
              return [
                ...prev,
                { id: `live_u_${Date.now()}`, role: 'user', text: msg.inputTranscript },
              ];
            });
          }
          if (msg.outputTranscript) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'coach' && last.id.startsWith('live_c_')) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text}${msg.outputTranscript}` },
                ];
              }
              return [
                ...prev,
                { id: `live_c_${Date.now()}`, role: 'coach', text: msg.outputTranscript },
              ];
            });
          }
          if (msg.turnComplete) {
            setMessages((prev) =>
              prev.map((m, idx) =>
                idx === prev.length - 1 && (m.id.startsWith('live_c_') || m.id.startsWith('live_u_'))
                  ? { ...m, id: `done_${m.id}` }
                  : m
              )
            );
          }
          if (msg.interrupted) {
            // Stop every active queued PCM buffer immediately so interrupted speech never overlaps the next reply
            stopAllAudioPlayback();
            setMessages((prev) =>
              prev.map((m, idx) =>
                idx === prev.length - 1 && m.id.startsWith('live_c_')
                  ? { ...m, id: `done_${m.id}` }
                  : m
              )
            );
          }
          if (msg.audio && outputCtxRef.current) {
            const ctx = outputCtxRef.current;
            if (ctx.state === 'suspended') {
              ctx.resume().catch(() => {});
            }
            const samples = base64ToPcmFloat32(msg.audio);
            const buffer = ctx.createBuffer(1, samples.length, 24000);
            buffer.getChannelData(0).set(samples);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);

            playbackRegistryRef.current.registerSource(source);
            setIsSpeaking(true);

            source.onended = () => {
              playbackRegistryRef.current.releaseSource(source);
              if (playbackRegistryRef.current.activeCount === 0 && !audioPlayerRef.current) {
                setIsSpeaking(false);
              }
            };

            const startAt = Math.max(ctx.currentTime, playbackRegistryRef.current.nextStartTime);
            source.start(startAt);
            playbackRegistryRef.current.nextStartTime = startAt + buffer.duration;
          }
        } catch {
          // Ignore malformed server frame
        }
      };

      ws.onerror = () => {
        if (!isStale() && !wsReadyRef.current) {
          window.clearTimeout(fallbackTimer);
          activateServerlessFallback();
        }
      };

      ws.onclose = () => {
        setMicActive(false);
        if (!isStale() && !wsReadyRef.current) {
          window.clearTimeout(fallbackTimer);
          activateServerlessFallback();
        }
      };
    } catch {
      window.clearTimeout(fallbackTimer);
      activateServerlessFallback();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      stopSession();
    };
  }, [isOpen]);

  const submitServerlessTurn = async (payload: {
    text?: string;
    audioBase64?: string;
    mimeType?: string;
  }) => {
    const myTurnGen = turnGateRef.current.nextTurn();
    stopAllAudioPlayback();
    setProcessing(true);
    setErrorMsg(null);
    if (payload.text) {
      setMessages((prev) => [
        ...prev,
        { id: `ut_${Date.now()}`, role: 'user', text: payload.text as string },
      ]);
    }

    try {
      const history = messagesRef.current
        .filter((m): m is TranscriptMessage & { role: 'user' | 'coach' } => m.role !== 'system')
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          contextSummary: contextRef.current,
          plannerState: snapshotRef.current,
          accountContext: accountContextRef.current,
          history,
          wantAudioReply: true,
        }),
      });
      const data = await res.json();
      if (!turnGateRef.current.isCurrentTurn(myTurnGen)) return;
      if (!res.ok) throw new Error(data.error || 'Voice Coach request failed.');

      if (!payload.text && data.userTranscript) {
        setMessages((prev) => [
          ...prev,
          { id: `uv_${Date.now()}`, role: 'user', text: data.userTranscript },
        ]);
      }

      if (Array.isArray(data.memoryAdditions) && data.memoryAdditions.length > 0) {
        onMemoryRef.current?.(data.memoryAdditions as AiMemoryAddition[]);
        setMessages((prev) => [
          ...prev,
          {
            id: `mem_${Date.now()}`,
            role: 'system',
            text: `Saved to account memory: ${(data.memoryAdditions as AiMemoryAddition[])
              .map((m) => m.fact)
              .slice(0, 2)
              .join(' · ')}`,
          },
        ]);
      }

      if (data.updatedState) {
        onApplyRef.current(data.updatedState as PlannerSnapshot, data.appliedChanges || []);
      }

      if (Array.isArray(data.appliedChanges) && data.appliedChanges.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_${Date.now()}`,
            role: 'system',
            text: `Site updated: ${data.appliedChanges.slice(0, 4).join(' · ')}`,
            changes: data.appliedChanges,
          },
        ]);
      }

      if (data.coachText) {
        setMessages((prev) => [
          ...prev,
          {
            id: `cv_${Date.now()}`,
            role: 'coach',
            text: data.coachText,
            audioWavBase64: data.audioWavBase64 || null,
          },
        ]);
      }

      if (data.audioWavBase64) {
        playWavClip(data.audioWavBase64);
      } else if (data.coachText) {
        speakBrowserVoice(data.coachText);
      }
    } catch (err) {
      if (turnGateRef.current.isCurrentTurn(myTurnGen)) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to reach Voice Coach.');
      }
    } finally {
      if (turnGateRef.current.isCurrentTurn(myTurnGen)) {
        setProcessing(false);
      }
    }
  };

  const toggleMic = async () => {
    if (mode === 'serverless') {
      if (micActive && recorderRef.current) {
        recorderRef.current.stop();
        setMicActive(false);
        return;
      }

      stopAllAudioPlayback();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        streamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        recorderRef.current = recorder;
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          recorderRef.current = null;
          const actualMime = recorder.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(chunks, { type: actualMime });
          if (blob.size < 250) return;
          try {
            const audioBase64 = await blobToBase64(blob);
            await submitServerlessTurn({
              audioBase64,
              mimeType: actualMime.split(';')[0],
            });
          } catch (err) {
            setErrorMsg(
              err instanceof Error ? err.message : 'Failed to process recorded voice clip.'
            );
          }
        };

        recorder.start();
        setMicActive(true);
        setErrorMsg(null);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? `Microphone error: ${err.message}` : 'Microphone permission denied.'
        );
      }
      return;
    }

    // Real-time WebSocket mode
    if (micActive) {
      processorRef.current?.disconnect();
      gainNodeRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      inputCtxRef.current?.close();
      processorRef.current = null;
      gainNodeRef.current = null;
      streamRef.current = null;
      inputCtxRef.current = null;
      setMicActive(false);
      return;
    }

    stopAllAudioPlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      inputCtxRef.current = inputCtx;
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      const muteGain = inputCtx.createGain();
      muteGain.gain.value = 0;

      processorRef.current = processor;
      gainNodeRef.current = muteGain;

      // Connect through muted gain so local speakers never echo mic input
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const suppress = shouldSuppressMicFrame({
          echoShieldEnabled: echoShieldRef.current,
          activeSourceCount: playbackRegistryRef.current.activeCount,
          outputCurrentTime: outputCtxRef.current?.currentTime ?? 0,
          nextStartTime: playbackRegistryRef.current.nextStartTime,
        });
        if (suppress) return;
        const base64 = pcmFloatTo16BitBase64(e.inputBuffer.getChannelData(0));
        wsRef.current.send(JSON.stringify({ audio: base64 }));
      };
      setMicActive(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? `Microphone error: ${err.message}` : 'Microphone permission denied.'
      );
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = textInput.trim();
    if (!text || processing) return;

    stopAllAudioPlayback();

    if (mode === 'serverless') {
      setTextInput('');
      await submitServerlessTurn({ text });
      return;
    }

    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        stateSync: snapshotRef.current,
        accountContext: accountContextRef.current || null,
      })
    );
    wsRef.current.send(JSON.stringify({ text }));
    setMessages((prev) => [...prev, { id: `ut_${Date.now()}`, role: 'user', text }]);
    setTextInput('');
  };

  if (!isOpen) return null;

  const memoryCount = accountContext?.memories?.length || 0;

  // Compact minimized pill dock (leaves entire site unobstructed)
  if (minimized) {
    return (
      <div
        role="region"
        aria-label="Floating Voice Coach"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-[#111827]/95 backdrop-blur-md border border-amber-400/60 rounded-full px-3 py-2 shadow-2xl"
      >
        <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          Voice Coach
        </span>
        {isSpeaking && (
          <button
            type="button"
            onClick={stopAllAudioPlayback}
            aria-label="Stop Coach Audio"
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-rose-300"
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          disabled={status !== 'live' || processing}
          onClick={toggleMic}
          aria-label={micActive ? 'Mute or Stop Mic' : 'Start Mic'}
          className={`p-1.5 rounded-full text-xs font-bold transition-colors ${
            micActive
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 disabled:opacity-50'
          }`}
        >
          {micActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Expand Voice Coach"
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Voice Coach"
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Non-blocking compact bottom-right floating dock so the user sees the site live-update
  return (
    <aside
      role="region"
      aria-label="Live Voice Coach"
      className="fixed bottom-4 right-4 z-40 w-[355px] sm:w-[405px] max-w-[calc(100vw-1.5rem)] bg-[#111827]/95 backdrop-blur-xl border border-amber-400/50 rounded-2xl overflow-hidden shadow-2xl"
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-[#0D1320]/90 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
          <h2 className="font-display text-xs font-bold text-white truncate">
            AI Voice Co-Pilot
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 shrink-0">
            {mode === 'live-ws' ? 'Live' : 'Audio'}
          </span>
          {memoryCount > 0 && (
            <span
              title={`${memoryCount} account AI memories active`}
              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0"
            >
              <BrainCircuit className="w-2.5 h-2.5" />
              {memoryCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {mode === 'live-ws' && (
            <button
              type="button"
              onClick={() => setEchoShield((v) => !v)}
              title={
                echoShield
                  ? 'Echo Shield ON: Pauses mic while Coach speaks so speakers cannot trigger double replies'
                  : 'Echo Shield OFF: Full-duplex interruption (best with headphones)'
              }
              aria-label="Toggle Echo Shield"
              className={`p-1 rounded-lg border text-[10px] transition-colors ${
                echoShield
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          )}
          {isSpeaking && (
            <button
              type="button"
              onClick={stopAllAudioPlayback}
              aria-label="Stop Coach Audio"
              title="Stop Coach Voice"
              className="p-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:text-white"
            >
              <VolumeX className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            aria-label="Minimize Voice Coach"
            onClick={() => setMinimized(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Close Voice Coach"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-2.5 text-[11px] text-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="h-44 overflow-y-auto bg-[#090D16]/90 border border-slate-800 rounded-xl p-2.5 space-y-2 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === 'user'
                  ? 'text-amber-300 font-medium'
                  : m.role === 'coach'
                  ? 'text-slate-100'
                  : 'text-emerald-300 text-[11px] bg-emerald-950/30 border border-emerald-500/25 rounded-lg px-2 py-1 flex items-center gap-1.5'
              }
            >
              {m.role === 'system' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{m.text}</span>
                </>
              ) : (
                <div>
                  <span className="font-semibold mr-1.5">
                    {m.role === 'user' ? 'You:' : 'Coach:'}
                  </span>
                  <span>{m.text}</span>
                  {m.role === 'coach' &&
                    m.id !== 'serverless_ready' &&
                    !m.id.startsWith('r_') && (
                      <button
                        type="button"
                        onClick={() =>
                          m.audioWavBase64
                            ? playWavClip(m.audioWavBase64)
                            : speakBrowserVoice(m.text)
                        }
                        className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 border border-slate-700 align-middle"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{m.audioWavBase64 ? 'Replay' : 'Listen'}</span>
                      </button>
                    )}
                </div>
              )}
            </div>
          ))}
          {processing && (
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              <span>Updating website & preparing voice reply...</span>
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={status !== 'live' || processing}
            onClick={toggleMic}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
              micActive
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950'
            }`}
          >
            {status === 'connecting' || processing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : micActive ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
            <span>
              {micActive ? (mode === 'serverless' ? 'Send' : 'Mute') : 'Mic'}
            </span>
          </button>

          <form onSubmit={handleSendText} className="flex-1 flex gap-1.5 min-w-0">
            <input
              type="text"
              aria-label="Dictate items or command to Voice Coach"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Read items, costs, beauty, or ask..."
              className="flex-1 min-w-0 bg-[#090D16] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={status !== 'live' || processing}
              aria-label="Send message to Voice Coach"
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 border border-slate-700 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
