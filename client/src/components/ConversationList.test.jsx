// Verifies the list renders each conversation's display name (group
// name, or the other DM member's username) and calls onSelect with
// the clicked conversation's id.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { ConversationList } from './ConversationList';

const conversations = [
  { _id: 'c1', isGroup: false, members: [{ _id: 'u1', username: 'me' }, { _id: 'u2', username: 'bob' }] },
  { _id: 'c2', isGroup: true, name: 'Study Group', members: [] },
];

describe('ConversationList', () => {
  it('shows the other member\'s name for a DM', () => {
    render(<ConversationList conversations={conversations} currentUserId="u1" onSelect={() => {}} />);
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('shows the group name for a group conversation', () => {
    render(<ConversationList conversations={conversations} currentUserId="u1" onSelect={() => {}} />);
    expect(screen.getByText('Study Group')).toBeInTheDocument();
  });

  it('calls onSelect with the conversation id when clicked', async () => {
    const onSelect = vi.fn();
    render(<ConversationList conversations={conversations} currentUserId="u1" onSelect={onSelect} />);
    await userEvent.click(screen.getByText('bob'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });
});
