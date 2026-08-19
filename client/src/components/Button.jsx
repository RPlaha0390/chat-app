import { LoadingDots } from './LoadingDots';

const VARIANTS = {
  primary:
    'bg-primary hover:bg-primary-hover dark:bg-primary-dark dark:hover:bg-primary-hover-dark text-white',
  ghost:
    'bg-transparent text-ink dark:text-ink-dark hover:bg-black/5 dark:hover:bg-white/5',
};

// Every button that triggers an async action (login, register, create
// conversation, upload) goes through this so "in flight" always looks
// and behaves the same way: disabled, dimmed, LoadingDots swapped in
// for the label.
export function Button({ loading = false, variant = 'primary', className = '', children, disabled, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`font-display font-semibold rounded-lg px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {loading ? <LoadingDots /> : children}
    </button>
  );
}
