import { useContext, useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { formatDateTime } from '../lib/utils';
import { latestUnseenUrgent, markUrgentSeen, mergeRemoteUrgent, subscribeUrgent } from '../lib/urgentBroadcast';
import { enableUrgentPush, fetchUrgentHub, notificationPermission, registerUrgentWorker } from '../lib/pushNotify';

export default function UrgentBroadcastHost() {
  const { user } = useContext(AuthContext);
  const [note, setNote] = useState(null);

  useEffect(() => {
    registerUrgentWorker();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setNote(null);
      return undefined;
    }
    const pull = () => setNote(latestUnseenUrgent(user.id));
    const hydrate = async () => {
      try {
        const hub = await fetchUrgentHub();
        mergeRemoteUrgent(hub.messages || []);
      } catch {
        /* local only */
      }
      pull();
      if (notificationPermission() === 'granted') {
        enableUrgentPush(user.id).catch(() => {});
      }
    };
    hydrate();
    return subscribeUrgent(pull);
  }, [user?.id]);

  if (!user?.id || !note) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 min-[768px]:items-center">
      <div className="absolute inset-0 bg-black/65" />
      <div className="relative w-full max-w-md rounded-[28px] bg-[#1c1410] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.5)] ring-1 ring-[#f0b429]/35">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#f0b429] px-3 py-1 text-xs font-black text-[#3a2a00]">
          <Megaphone size={14} /> Təcili mesaj
        </p>
        <p className="mt-4 whitespace-pre-wrap text-lg font-extrabold leading-snug">{note.text}</p>
        <p className="mt-3 text-xs font-semibold text-white/50">
          {note.fromName || 'Admin'}
          {note.at ? ` · ${formatDateTime(note.at)}` : ''}
        </p>
        <button
          type="button"
          onClick={() => {
            markUrgentSeen(user.id, note.id);
            setNote(latestUnseenUrgent(user.id));
          }}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-[#f0b429] text-sm font-extrabold text-[#3a2a00]"
        >
          Oxudum
        </button>
      </div>
    </div>
  );
}
