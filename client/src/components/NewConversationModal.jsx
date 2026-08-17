import { useState } from 'react';

// userOptions: [{ _id, username }] — the caller (ChatPage) is
// responsible for fetching the list of users to choose from.
export function NewConversationModal({ userOptions, onCreate, onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [name, setName] = useState('');
  const isGroup = selectedIds.length > 1;

  function toggle(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleCreate() {
    onCreate({ memberIds: selectedIds, isGroup, name: isGroup ? name : undefined });
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white rounded p-4 w-80 flex flex-col gap-3">
        <h3 className="font-semibold">New conversation</h3>

        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {userOptions.map((u) => (
            <label key={u._id} className="flex items-center gap-2">
              <input type="checkbox" checked={selectedIds.includes(u._id)} onChange={() => toggle(u._id)} />
              {u.username}
            </label>
          ))}
        </div>

        {isGroup && (
          <input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2"
          />
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={selectedIds.length === 0}
            className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
