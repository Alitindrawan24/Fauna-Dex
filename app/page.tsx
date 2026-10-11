'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MonsterCardComponent from '@/components/MonsterCard';
import StatusIndicator from '@/components/StatusIndicator';
import Toast from '@/components/Toast';
import {
  clearAllCards,
  clearAllPendingPhotos,
  getCards,
  getPendingPhotos,
  MonsterCard,
  PendingPhoto,
  removeCard,
  removePendingPhoto,
  saveCard,
  savePendingPhoto,
} from '@/lib/storage';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Home() {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [cards, setCards] = useState<MonsterCard[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load state from storage on mount
  useEffect(() => {
    getPendingPhotos().then(setPendingPhotos).catch(console.error);
    getCards().then(setCards).catch(console.error);
  }, []);

  const handleCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const id = crypto.randomUUID();
        try {
          await savePendingPhoto(id, base64);
          const updated = await getPendingPhotos();
          setPendingPhotos(updated);
          addToast('Photo saved for sync!', 'info');
        } catch (err) {
          console.error(err);
          addToast('Failed to save photo.', 'error');
        }
      };
      reader.readAsDataURL(file);

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addToast],
  );

  const handleSync = useCallback(async () => {
    if (pendingPhotos.length === 0 || syncing) return;
    setSyncing(true);

    let successCount = 0;
    const remaining = [...pendingPhotos];

    for (const photo of pendingPhotos) {
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: photo.base64 }),
        });

        if (!res.ok) {
          const { error } = (await res.json()) as { error: string };
          throw new Error(error || `HTTP ${res.status}`);
        }

        const cardData = (await res.json()) as Omit<MonsterCard, 'id' | 'imageBase64' | 'createdAt'>;

        const card: MonsterCard = {
          ...cardData,
          id: photo.id,
          imageBase64: photo.base64,
          createdAt: new Date().toISOString(),
        };

        await saveCard(card);
        await removePendingPhoto(photo.id);

        remaining.splice(remaining.findIndex((p) => p.id === photo.id), 1);
        setPendingPhotos([...remaining]);
        setCards(await getCards());
        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        addToast(`Sync failed for one photo: ${msg}`, 'error');
      }
    }

    setPendingPhotos(await getPendingPhotos());
    setSyncing(false);

    if (successCount > 0) {
      addToast(`${successCount} photo${successCount !== 1 ? 's' : ''} synced!`, 'success');
    }
  }, [pendingPhotos, syncing, addToast]);

  // Delete a single pending photo from the queue
  const handleDeletePending = useCallback(
    async (id: string) => {
      try {
        await removePendingPhoto(id);
        setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
        addToast('Photo removed from queue.', 'info');
      } catch {
        addToast('Failed to remove photo.', 'error');
      }
    },
    [addToast],
  );

  // Delete all pending photos at once
  const handleClearPending = useCallback(async () => {
    if (!confirm(`Delete all ${pendingPhotos.length} pending photo(s)?`)) return;
    try {
      await clearAllPendingPhotos();
      setPendingPhotos([]);
      addToast('Pending queue cleared.', 'info');
    } catch {
      addToast('Failed to clear queue.', 'error');
    }
  }, [pendingPhotos.length, addToast]);

  // Delete a single monster card
  const handleDeleteCard = useCallback(
    async (id: string) => {
      try {
        await removeCard(id);
        setCards((prev) => prev.filter((c) => c.id !== id));
        addToast('Card deleted.', 'info');
      } catch {
        addToast('Failed to delete card.', 'error');
      }
    },
    [addToast],
  );

  // Delete all monster cards
  const handleClearAllCards = useCallback(async () => {
    if (!confirm(`Delete all ${cards.length} monster card(s)? This cannot be undone.`)) return;
    try {
      await clearAllCards();
      setCards([]);
      addToast('All cards deleted.', 'info');
    } catch {
      addToast('Failed to delete cards.', 'error');
    }
  }, [cards.length, addToast]);

  return (
    <main className="min-h-screen bg-[#6B0000] flex items-start justify-center py-4 px-2">
      {/* Pokédex device shell */}
      <div className="pokedex-body w-full max-w-sm rounded-[20px] overflow-hidden flex flex-col">

        {/* Top hinge bar */}
        <div className="pokedex-hinge h-2 w-full" />

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Decorative camera lens */}
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="#1a1a2e" stroke="#3B82F6" strokeWidth="2" />
            <circle cx="24" cy="24" r="14" fill="#0d1b2a" stroke="#3B82F6" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="8" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1" />
            <circle cx="24" cy="24" r="3" fill="#93c5fd" />
            <circle cx="19" cy="19" r="2" fill="white" opacity="0.4" />
          </svg>

          {/* Title */}
          <h1 className="font-pixel text-white text-xs tracking-widest">FAUNA-DEX</h1>

          {/* Three status dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-300 border border-red-900 shadow-inner" />
            <span className="w-3 h-3 rounded-full bg-yellow-300 border border-yellow-900 shadow-inner" />
            <span className="w-3 h-3 rounded-full bg-green-400 border border-green-900 shadow-inner animate-pulse" />
          </div>
        </div>

        {/* Screen bezel */}
        <div className="mx-4 mb-0 rounded-xl bg-[#1a1a2e] p-2 screen-glow">
          {/* Inner screen panel */}
          <div className="rounded-lg bg-[#0d1b2a] scanlines min-h-[280px] flex flex-col">

            {/* Status bar */}
            <div className="px-3 pt-3 pb-1">
              <StatusIndicator />
            </div>

            {/* Card grid or empty state */}
            <div className="flex-1 px-3 pb-3 pt-2 overflow-y-auto max-h-[420px]">
              {cards.length > 0 ? (
                <>
                  {/* Cards header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[8px] font-pixel text-[#e2f4ff] uppercase tracking-wide">
                      DEX: {cards.length} ENTRIES
                    </span>
                    <button
                      onClick={handleClearAllCards}
                      className="text-[8px] font-mono text-slate-500 hover:text-red-400 transition-colors"
                      aria-label="Delete all monster cards"
                    >
                      [DELETE ALL]
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {cards.map((card) => (
                      <MonsterCardComponent key={card.id} card={card} onDelete={handleDeleteCard} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-4 opacity-30">?</div>
                  <p className="text-[9px] font-pixel text-slate-500 leading-relaxed whitespace-pre-line">
                    {'NO FAUNA\nCATALOGUED'}
                  </p>
                  <p className="text-[8px] font-mono text-slate-600 mt-2">Capture &amp; sync to begin</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Control panel */}
        <div className="px-4 py-5 flex flex-col items-center gap-4">

          {/* Capture button */}
          <label
            htmlFor="camera-input"
            className="capture-btn cursor-pointer w-24 h-24 rounded-full flex flex-col items-center justify-center text-white"
            aria-label="Capture a fauna photo"
          >
            <span className="text-lg mb-1">◉</span>
            <span className="text-[7px] font-pixel text-center leading-relaxed whitespace-pre-line">
              {'SCAN\nFAUNA'}
            </span>
          </label>

          {/* Hidden file input */}
          <input
            id="camera-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleCapture}
            aria-hidden="true"
          />

          {/* Pending strip */}
          {pendingPhotos.length > 0 && (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[8px] font-pixel text-amber-400">
                  ● {pendingPhotos.length} DATA PENDING
                </div>
                <button
                  onClick={handleClearPending}
                  className="text-[8px] font-mono text-slate-500 hover:text-red-400 transition-colors"
                  aria-label="Clear all pending photos"
                >
                  CLEAR ALL
                </button>
              </div>

              {/* Thumbnail scroll */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingPhotos.map((photo, i) => (
                  <div key={photo.id} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.base64}
                      alt={`Pending photo ${i + 1}`}
                      className="w-14 h-14 object-cover rounded border border-[#1e3a5f]"
                    />
                    <button
                      onClick={() => handleDeletePending(photo.id)}
                      aria-label={`Remove pending photo ${i + 1}`}
                      className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-black/80 text-slate-400 hover:bg-red-600 hover:text-white transition-colors text-[8px]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={pendingPhotos.length === 0 || syncing}
            className="sync-btn w-full py-3 px-4 rounded-sm text-[9px] font-pixel text-green-400 disabled:text-slate-600 uppercase tracking-widest"
            aria-label={syncing ? 'Syncing photos…' : 'Sync pending photos to AI'}
          >
            {syncing ? '⏳ SYNCING...' : '▶ SYNC TO AI'}
          </button>

        </div>

        {/* Bottom hinge bar */}
        <div className="pokedex-hinge h-2 w-full" />
      </div>

      {/* Toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </main>
  );
}
