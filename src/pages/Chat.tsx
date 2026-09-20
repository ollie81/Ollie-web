import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import OllieOrb from '../components/OllieOrb';
import {
  base64ToBlob,
  ChatMessageRow,
  chatVoice,
  getHistory,
  getModeStarter,
  getUsage,
  sendMessage,
  VoicePremiumRequiredError,
} from '../lib/api';
import './Chat.css';

interface Message {
  clientId: string;
  id: string | null;
  text: string;
  isOllie: boolean;
  failed?: boolean;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function rowToMessage(row: ChatMessageRow): Message {
  return { clientId: row.id ?? uid(), id: row.id, text: row.message, isOllie: row.sender === 'ollie' };
}

// MediaRecorder's default mimeType isn't guaranteed to produce
// something Whisper (backend's transcription) recognizes by
// extension -- picking one explicitly, in this priority order, and
// naming the uploaded file to match, is the same "know the real
// shape, don't assume" discipline this app's other integrations
// followed. audio/webm covers Chrome/Firefox/desktop Safari;
// audio/mp4 (aac) is what iOS Safari actually supports.
function pickRecorderMimeType(): { mimeType?: string; ext: string } {
  const candidates: Array<{ mimeType: string; ext: string }> = [
    { mimeType: 'audio/webm', ext: 'webm' },
    { mimeType: 'audio/mp4', ext: 'm4a' },
    { mimeType: 'audio/ogg', ext: 'ogg' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c.mimeType)) return c;
  }
  return { ext: 'webm' };
}

export default function Chat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streak, setStreak] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [header, setHeader] = useState(t('chat.moodDefault'));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Same lightweight keyword read as chat_screen.dart's
  // _updateEmotionalHeader -- purely cosmetic, but it's one of the
  // small touches that makes the chat feel alive rather than static.
  // English-only keyword matching: harmless in any language (a reply
  // in another language just always falls through to the default
  // mood line, same as a neutral English reply would).
  function emotionalHeaderFor(text: string): string {
    const lower = text.toLowerCase();
    if (!text) return t('chat.moodDefault');
    if (lower.includes('sad') || lower.includes('bad') || lower.includes('cry')) return t('chat.moodSad');
    if (lower.includes('happy') || lower.includes('good') || lower.includes('great')) return t('chat.moodHappy');
    if (lower.includes('love') || lower.includes('crush')) return t('chat.moodLove');
    return t('chat.moodListening');
  }

  // ---- voice ----
  // Voice-out only ever follows voice-in: if you record a voice
  // message, Ollie's reply plays back automatically, like a WhatsApp
  // voice note landing -- not a button you tap. Typed messages stay
  // text-only. Auto-playing on *every* reply (an earlier version of
  // this) would call the paid TTS provider on every single message
  // instead of only when the user actually asked for a voice
  // exchange, which is real, avoidable cost.
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<{ text: string; upgrade?: boolean } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingExtRef = useRef('webm');
  const streamRef = useRef<MediaStream | null>(null);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Leaving the chat mid-recording or mid-playback shouldn't leave
  // the mic hot or Ollie's voice still playing in the background.
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      playingAudioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const [history, usage] = await Promise.all([getHistory(), getUsage().catch(() => null)]);
      setMessages(history.map(rowToMessage));
      if (usage) setStreak(usage.current_streak ?? 0);
      setLoadingHistory(false);

      // Arrived from a Home quick-action chip ("Plan my day", "Study
      // together", …) -- have Ollie speak first, same as
      // home_screen.dart's _openMode + chat_screen.dart's initialMode
      // handling. Best-effort: a failure here just means the chat
      // opens silently, which is still a perfectly usable screen.
      // Text, not voice -- see playReply's comment for why.
      const navState = location.state as { mode?: string } | null;
      if (navState?.mode) {
        setIsTyping(true);
        try {
          const { reply } = await getModeStarter(navState.mode);
          setMessages((m) => [...m, { clientId: uid(), id: null, text: reply, isOllie: true }]);
          setHeader(emotionalHeaderFor(reply));
        } catch {
          // silent -- see comment above
        } finally {
          setIsTyping(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  async function requestReply(userMsg: Message) {
    setIsTyping(true);
    try {
      const response = await sendMessage(userMsg.text);
      setMessages((m) =>
        m.map((msg) => (msg.clientId === userMsg.clientId ? { ...msg, id: response.user_message_id } : msg)),
      );
      const ollieMsg: Message = { clientId: uid(), id: response.message_id, text: response.reply, isOllie: true };
      setMessages((m) => [...m, ollieMsg]);
      setHeader(emotionalHeaderFor(response.reply));
      if (typeof response.streak === 'number') setStreak(response.streak);
      // No auto-voice here -- typed messages get a text reply back,
      // same as before. See playReply's comment.
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.somethingWrong');
      if (message.includes('Daily limit reached')) {
        setLimitReached(true);
      } else {
        setMessages((m) => m.map((msg) => (msg.clientId === userMsg.clientId ? { ...msg, failed: true } : msg)));
      }
    } finally {
      setIsTyping(false);
    }
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    setLimitReached(false);
    setHeader(emotionalHeaderFor(text));
    const userMsg: Message = { clientId: uid(), id: null, text, isOllie: false };
    setMessages((m) => [...m, userMsg]);
    requestReply(userMsg);
  }

  function retry(msg: Message) {
    setMessages((m) => m.map((x) => (x.clientId === msg.clientId ? { ...x, failed: false } : x)));
    requestReply(msg);
  }

  // ---- voice output: plays Ollie's spoken reply, bundled into the
  // same /chat/voice response as the transcription+text reply (see
  // chatVoice's includeAudio param) -- not a separate /speak call,
  // so a full voice exchange is exactly one request. ----
  function playBlob(clientId: string, blob: Blob) {
    playingAudioRef.current?.pause();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    playingAudioRef.current = audio;
    setPlayingMessageId(clientId);
    const clear = () => {
      setPlayingMessageId((id) => (id === clientId ? null : id));
      URL.revokeObjectURL(url);
    };
    audio.onended = clear;
    audio.onerror = clear;
    audio.play().catch(clear);
  }

  function stopPlaying() {
    playingAudioRef.current?.pause();
    setPlayingMessageId(null);
  }

  // ---- voice input: mic button in the input bar ----
  async function startRecording() {
    if (recording || isTyping) return;
    setVoiceNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mimeType, ext } = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recordingExtRef.current = ext;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void handleRecordingStopped();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setVoiceNotice({ text: t('chat.micPermissionError') });
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleRecordingStopped() {
    const blob = new Blob(recordedChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
    recordedChunksRef.current = [];
    if (blob.size === 0) return;

    setLimitReached(false);
    setVoiceNotice(null);
    setIsTyping(true);
    try {
      const result = await chatVoice(blob, `voice.${recordingExtRef.current}`, undefined, true);
      const userMsg: Message = { clientId: uid(), id: null, text: result.transcribed_text, isOllie: false };
      const ollieMsg: Message = { clientId: uid(), id: result.message_id, text: result.reply, isOllie: true };
      setMessages((m) => [...m, userMsg, ollieMsg]);
      setHeader(emotionalHeaderFor(result.reply));
      if (typeof result.streak === 'number') setStreak(result.streak);
      if (result.audio_base64) {
        playBlob(ollieMsg.clientId, base64ToBlob(result.audio_base64));
      }
    } catch (err) {
      if (err instanceof VoicePremiumRequiredError) {
        setVoiceNotice({ text: t('chat.voicePremiumChat'), upgrade: true });
      } else {
        setVoiceNotice({ text: err instanceof Error ? err.message : t('chat.voiceHearError') });
      }
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="page-shell chat-page">
      <header className="chat-header">
        <button className="settings-back" onClick={() => navigate('/home')} aria-label={t('common.back')}>
          ←
        </button>
        <OllieOrb size={40} breathing />
        <div className="chat-header__titles">
          <span className="chat-header__name">{t('chat.name')}</span>
          <span className="chat-header__status">{t('chat.status')}</span>
        </div>
        <div className="chat-header__spacer" />
        {streak > 0 && (
          <span className="streak-badge" title={`${streak}-day streak`}>
            🔥 {streak}
          </span>
        )}
      </header>

      <div className="emotional-pill">{header}</div>

      <div className="chat-messages" ref={scrollRef}>
        {loadingHistory ? (
          <div className="chat-empty">{t('chat.loadingConversation')}</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">{t('chat.sayHi')}</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.clientId} className={`bubble-row${msg.isOllie ? '' : ' bubble-row--user'}`}>
              {msg.isOllie && <OllieOrb size={28} />}
              <div className="bubble-col">
                <div className={`bubble${msg.isOllie ? ' bubble--ollie' : ' bubble--user'}`}>{msg.text}</div>
                {msg.isOllie && playingMessageId === msg.clientId && (
                  <button type="button" className="bubble-speak bubble-speak--active" onClick={stopPlaying}>
                    {t('chat.speakingTapToStop')}
                  </button>
                )}
                {msg.failed && (
                  <button className="bubble-retry" onClick={() => retry(msg)}>
                    {t('chat.retrySend')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="bubble-row">
            <OllieOrb size={28} />
            <div className="bubble bubble--ollie bubble--typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {limitReached && (
        <div className="limit-banner">
          <span>{t('chat.outOfMessages')}</span>
          <Link to="/premium" className="btn-pill limit-banner__cta">
            {t('common.goPremium')}
          </Link>
        </div>
      )}

      {voiceNotice && (
        <div className="error-banner voice-notice">
          <span>{voiceNotice.text}</span>
          {voiceNotice.upgrade && (
            <Link to="/premium" className="voice-notice__link">
              {t('common.goPremium')}
            </Link>
          )}
        </div>
      )}

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          className="field chat-input"
          type="text"
          placeholder={recording ? t('chat.recordingPlaceholder') : t('chat.inputPlaceholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping || recording}
        />
        <button
          type="button"
          className={`chat-mic${recording ? ' chat-mic--recording' : ''}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={isTyping && !recording}
          aria-label={recording ? t('chat.stopRecording') : t('chat.recordVoice')}
        >
          {recording ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path d="M19 11a7 7 0 0 1-14 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <button className="chat-send" type="submit" disabled={isTyping || recording || !input.trim()} aria-label={t('chat.send')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 12L20 4L14 20L11 13L4 12Z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}
