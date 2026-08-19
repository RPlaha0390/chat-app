// The one loading/status motif reused everywhere something async is in
// flight: button spinners, the typing indicator, message-sending state.
// A consistent shape for "something is happening" beats a different
// spinner per screen.
export function LoadingDots({ className = '' }) {
  return (
    <span className={`pulse-dots ${className}`} role="status" aria-label="Loading">
      <span />
      <span />
      <span />
    </span>
  );
}
