import { useState } from 'react';
import { Button } from './Button';

// userOptions: [{ _id, username }] — the caller (ChatPage) is
// responsible for fetching the list of users to choose from.
export function NewConversationModal({ userOptions, onCreate, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const isGroup = selectedIds.length > 1;

  function toggle(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    setIsCreating(true);
    try {
      await onCreate({ memberIds: selectedIds, isGroup, name: isGroup ? name : undefined });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-raised dark:bg-raised-dark rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 shadow-xl">
        <h3 className="font-display font-semibold text-ink dark:text-ink-dark">New conversation</h3>

        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {userOptions.map((u) => (
            <label
              key={u._id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-ink dark:text-ink-dark cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(u._id)}
                onChange={() => toggle(u._id)}
                className="accent-primary dark:accent-primary-dark"
              />
              {u.username}
            </label>
          ))}
        </div>

        {isGroup && (
          <input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-black/10 dark:border-white/10 bg-surface dark:bg-surface-dark rounded-lg px-3 py-2 text-ink dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
          />
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={isCreating} disabled={selectedIds.length === 0}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
