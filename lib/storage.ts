import type LocalForage from 'localforage';

export interface MonsterCard {
  id: string;
  monsterName: string;
  realSpecies: string;
  type: 'Grass' | 'Water' | 'Fire' | 'Bug' | 'Poison' | 'Normal' | 'Flying';
  hp: number;
  skill: string;
  description: string;
  imageBase64: string;
  createdAt: string;
}

export interface PendingPhoto {
  id: string;
  base64: string;
}

let _queueStore: LocalForage | null = null;
let _cardsStore: LocalForage | null = null;

function getQueueStore(): LocalForage {
  if (typeof window === 'undefined') {
    throw new Error('localforage is client-only');
  }
  if (!_queueStore) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const localforage = require('localforage') as typeof import('localforage');
    _queueStore = localforage.createInstance({ name: 'fauna-dex-queue' });
  }
  return _queueStore;
}

function getCardsStore(): LocalForage {
  if (typeof window === 'undefined') {
    throw new Error('localforage is client-only');
  }
  if (!_cardsStore) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const localforage = require('localforage') as typeof import('localforage');
    _cardsStore = localforage.createInstance({ name: 'fauna-dex-cards' });
  }
  return _cardsStore;
}

export async function savePendingPhoto(id: string, base64: string): Promise<void> {
  const store = getQueueStore();
  await store.setItem<PendingPhoto>(id, { id, base64 });
}

export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  const store = getQueueStore();
  const items: PendingPhoto[] = [];
  await store.iterate<PendingPhoto, void>((value) => {
    items.push(value);
  });
  return items;
}

export async function removePendingPhoto(id: string): Promise<void> {
  const store = getQueueStore();
  await store.removeItem(id);
}

export async function saveCard(card: MonsterCard): Promise<void> {
  const store = getCardsStore();
  await store.setItem<MonsterCard>(card.id, card);
}

export async function getCards(): Promise<MonsterCard[]> {
  const store = getCardsStore();
  const items: MonsterCard[] = [];
  await store.iterate<MonsterCard, void>((value) => {
    items.push(value);
  });
  return items;
}

export async function removeCard(id: string): Promise<void> {
  const store = getCardsStore();
  await store.removeItem(id);
}

export async function clearAllCards(): Promise<void> {
  const store = getCardsStore();
  await store.clear();
}

export async function clearAllPendingPhotos(): Promise<void> {
  const store = getQueueStore();
  await store.clear();
}
