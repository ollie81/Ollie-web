import './AnimatedBackground.css';

// The slow-shifting purple gradient + drifting glow that chat_screen.dart
// builds from an AnimationController + CustomPaint particle field. Done
// here in pure CSS instead of canvas/JS -- cheaper on low-end phones,
// and automatically honors prefers-reduced-motion via the global rule
// in theme.css (animations freeze to a single static frame instead of
// being separately special-cased here).
export default function AnimatedBackground() {
  return (
    <div className="ollie-bg" aria-hidden="true">
      <div className="ollie-bg__gradient" />
      <div className="ollie-bg__glow ollie-bg__glow--a" />
      <div className="ollie-bg__glow ollie-bg__glow--b" />
      <div className="ollie-bg__glow ollie-bg__glow--c" />
    </div>
  );
}
