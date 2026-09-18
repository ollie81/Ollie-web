import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import OllieOrb from '../components/OllieOrb';
import { ChatMessageRow, getHistory, getUsage, logout, sendMessage } from '../lib/api';
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

// Same lightweight keyword read as chat_screen.dart's
// _updateEmotionalHeader -- purely cosmetic, but it's one of the
// small touches that makes the chat feel alive rather than static.
function emotionalHeaderFor(text: string): string {
  const lower = text.toLowerCase();
  if (!text) return 'hey there 😊';
  if (lower.includes('sad') || lower.includes('bad') || lower.includes('cry')) return "i'm here 🤗";
  if (lower.includes('happy') || lower.includes('good') || lower.includes('great')) return "let's gooo 🎉";
  if (lower.includes('love') || lower.includes('crush')) return 'awww 💕';
  return 'always listening 💡';
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streak, setStreak] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [header, setHeader] = useState('hey there 😊');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [history, usage] = await Promise.all([getHistory(), getUsage().catch(() => null)]);
      setMessages(history.map(rowToMessage));
      if (usage) setStreak(usage.current_streak ?? 0);
      setLoadingHistory(false);
    })();
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
      if (typeof response.current_streak === 'number') setStreak(response.current_streak);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
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

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }

  return (
    <div className="page-shell chat-page">
      <header className="chat-header">
        <OllieOrb size={40} breathing />
        <div className="chat-header__titles">
          <span className="chat-header__name">Ollie</span>
          <span className="chat-header__status">always here</span>
        </div>
        <div className="chat-header__spacer" />
        {streak > 0 && (
          <span className="streak-badge" title={`${streak}-day streak`}>
            🔥 {streak}
          </span>
        )}
        <button className="btn-text" onClick={handleLogout} aria-label="Log out">
          Log out
        </button>
      </header>

      <div className="emotional-pill">{header}</div>

      <div className="chat-messages" ref={scrollRef}>
        {loadingHistory ? (
          <div className="chat-empty">Loading your conversation…</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">Say hi to Ollie 👋</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.clientId} className={`bubble-row${msg.isOllie ? '' : ' bubble-row--user'}`}>
              {msg.isOllie && <OllieOrb size={28} />}
              <div className="bubble-col">
                <div className={`bubble${msg.isOllie ? ' bubble--ollie' : ' bubble--user'}`}>{msg.text}</div>
                {msg.failed && (
                  <button className="bubble-retry" onClick={() => retry(msg)}>
                    Couldn't send · Retry
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
          <span>You're out of free messages for today.</span>
          <Link to="/premium" className="btn-pill limit-banner__cta">
            Go premium
          </Link>
        </div>
      )}

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          className="field chat-input"
          type="text"
          placeholder="Message Ollie…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
        />
        <button className="chat-send" type="submit" disabled={isTyping || !input.trim()} aria-label="Send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 12L20 4L14 20L11 13L4 12Z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}
