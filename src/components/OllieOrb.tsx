import './OllieOrb.css';

interface OllieOrbProps {
  size?: number;
  breathing?: boolean;
}

// The coral gradient circle with the glow + "O" mark that stands in
// for Ollie throughout chat_screen.dart (header avatar, per-message
// avatar) -- same treatment here, same breathing scale animation.
export default function OllieOrb({ size = 42, breathing = false }: OllieOrbProps) {
  return (
    <div
      className={`ollie-orb${breathing ? ' ollie-orb--breathing' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      O
    </div>
  );
}
