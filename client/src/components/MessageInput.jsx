// Adds a file input for picking an attachment. Upload happens
// immediately on pick (via the injected onUpload, kept separate from
// api/upload.js so this component stays unit-testable without a real
// network call) — the resulting URL is held pending until send.
import { useState, useRef } from 'react';

const TYPING_STOP_DELAY_MS = 1500;

export function MessageInput({ onSend, onTypingChange, onUpload }) {
  const [text, setText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null); // { name, url }
  const stopTimeoutRef = useRef(null);

  function handleChange(e) {
    setText(e.target.value);
    onTypingChange(true);
    clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = setTimeout(() => onTypingChange(false), TYPING_STOP_DELAY_MS);
  }

  async function handleFilePick(e) {
    const file = e.target.files[0];
    if (!file || !onUpload) return;
    const url = await onUpload(file);
    setPendingAttachment({ name: file.name, url });
  }

  function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;

    onSend(trimmed, pendingAttachment?.url);
    setText('');
    setPendingAttachment(null);
    clearTimeout(stopTimeoutRef.current);
    onTypingChange(false);
  }

  return (
    <div className="flex flex-col gap-1 p-2 border-t">
      {pendingAttachment && <span className="text-xs text-gray-500">{pendingAttachment.name}</span>}
      <div className="flex items-center gap-2">
        <label className="cursor-pointer text-gray-500">
          📎
          <input
            type="file"
            accept="image/*"
            aria-label="Attach an image"
            onChange={handleFilePick}
            className="hidden"
          />
        </label>
        <input
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 border rounded px-3 py-2"
        />
      </div>
    </div>
  );
}
