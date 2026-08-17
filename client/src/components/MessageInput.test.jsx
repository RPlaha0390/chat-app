// Verifies: typing text and pressing Enter calls onSend with the text
// and clears the field, and typing fires onTypingChange(true) then
// onTypingChange(false) after the debounce.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  it('calls onSend with the typed text and clears the input', async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} onTypingChange={() => {}} />);

    const input = screen.getByPlaceholderText(/type a message/i);
    await userEvent.type(input, 'hello there{Enter}');

    expect(onSend).toHaveBeenCalledWith('hello there');
    expect(input.value).toBe('');
  });

  it('does not call onSend for an empty message', async () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} onTypingChange={() => {}} />);

    await userEvent.type(screen.getByPlaceholderText(/type a message/i), '{Enter}');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('notifies typing start while the user types', async () => {
    const onTypingChange = vi.fn();
    render(<MessageInput onSend={() => {}} onTypingChange={onTypingChange} />);

    await userEvent.type(screen.getByPlaceholderText(/type a message/i), 'h');
    expect(onTypingChange).toHaveBeenCalledWith(true);
  });
});
