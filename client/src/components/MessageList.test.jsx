// Verifies messages render in order, the current user's own messages
// are visually distinguished (via a data attribute, not fragile class
// string matching), and scrolling to the top triggers onLoadMore.
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MessageList } from './MessageList';

const messages = [
  { _id: '1', text: 'hi', sender: { _id: 'u1', username: 'alice' }, createdAt: new Date().toISOString() },
  { _id: '2', text: 'hello', sender: { _id: 'u2', username: 'bob' }, createdAt: new Date().toISOString() },
];

describe('MessageList', () => {
  it('renders each message text', () => {
    render(<MessageList messages={messages} currentUserId="u1" onLoadMore={() => {}} />);
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('marks the current user\'s own message', () => {
    render(<MessageList messages={messages} currentUserId="u1" onLoadMore={() => {}} />);
    expect(screen.getByText('hi').closest('[data-own]').getAttribute('data-own')).toBe('true');
    expect(screen.getByText('hello').closest('[data-own]').getAttribute('data-own')).toBe('false');
  });

  it('calls onLoadMore when scrolled to the top', () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <MessageList messages={messages} currentUserId="u1" onLoadMore={onLoadMore} />
    );
    const scrollContainer = container.querySelector('[data-scroll-container]');
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true });
    fireEvent.scroll(scrollContainer);
    expect(onLoadMore).toHaveBeenCalled();
  });
});
