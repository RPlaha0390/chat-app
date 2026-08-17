// Text input + Enter-to-send + typing notifications. Attachment
// picking is deliberately left out of this component's first version
// per the plan's task split — see the design spec's frontend section;
// it's wired in Task 10.
import { useState, useRef } from 'react';

const TYPING_STOP_DELAY_MS = 1500;

export function MessageInput({ onSend, onTypingChange }) {
  const [text, setText] = useState('');
  const stopTimeoutRef = useRef(null);

  function handleChange(e) {
    setText(e.target.value);
    onTypingChange(true);

    // Debounce: only fire "stopped typing" after a pause, not on every
    // keystroke, so the other user doesn't see a flickering indicator.
    clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = setTimeout(() => onTypingChange(false), TYPING_STOP_DELAY_MS);
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    const trimmed = text.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setText('');
    clearTimeout(stopTimeoutRef.current);
    onTypingChange(false);
  }

  return (
    <input
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Type a message..."
      className="w-full border rounded px-3 py-2"
    />
  );
}
