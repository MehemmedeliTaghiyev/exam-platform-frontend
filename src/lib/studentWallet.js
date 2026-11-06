import { useEffect, useState } from 'react';

export const WALLET_EVENT = 'exampulse-wallet';
export const WALLET_PACKS = [2, 5, 10, 20];

function keyOf(userId) {
  return `exampulse_wallet_${userId || 'me'}`;
}

function emit() {
  window.dispatchEvent(new CustomEvent(WALLET_EVENT));
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  emit();
}

function emptyWallet(user) {
  return {
    balance: user?.practice ? 5 : 0,
    createdAt: new Date().toISOString(),
    history: user?.practice
      ? [{
          id: `starter-${user.id}`,
          at: new Date().toISOString(),
          amount: 5,
          kind: 'credit',
          note: 'Məşq hesabı üçün başlanğıc balans',
          method: 'practice',
        }]
      : [],
  };
}

function persist(userId, row) {
  const stored = {
    balance: Math.round((Number(row.balance) || 0) * 100) / 100,
    createdAt: row.createdAt || new Date().toISOString(),
    history: Array.isArray(row.history) ? row.history.slice(0, 40) : [],
  };
  write(keyOf(userId), stored);
  return stored;
}

export function studentWallet(user) {
  if (!user?.id) return { balance: 0, history: [], createdAt: '' };
  if (user.role !== 'Student' && user.practiceRole !== 'Student') {
    return { balance: 0, history: [], createdAt: '' };
  }
  let row = read(keyOf(user.id), null);
  if (!row || typeof row !== 'object') {
    row = persist(user.id, emptyWallet(user));
  }
  return {
    ...row,
    balance: Math.max(0, Number(row.balance) || 0),
    history: Array.isArray(row.history) ? row.history : [],
  };
}

function pushTx(user, patch) {
  const account = studentWallet(user);
  const tx = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...patch,
  };
  return persist(user.id, {
    ...account,
    balance: patch.kind === 'debit'
      ? account.balance - Number(patch.amount || 0)
      : account.balance + Number(patch.amount || 0),
    history: [tx, ...account.history],
  });
}

export function topUpWallet(user, amount, method = 'card', note = 'Kartla yükləmə') {
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  if (!user?.id || value <= 0) return studentWallet(user);
  return pushTx(user, { amount: value, kind: 'credit', note, method });
}

export function creditWallet(user, amount, note = 'Geri ödəniş', method = 'refund') {
  return topUpWallet(user, amount, method, note);
}

export function spendWallet(user, amount, note = 'Ödəniş', method = 'wallet') {
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  if (!user?.id || value <= 0) return studentWallet(user);
  const account = studentWallet(user);
  if (account.balance + 1e-9 < value) {
    const err = new Error('BALANS_YOX');
    err.code = 'BALANS_YOX';
    throw err;
  }
  return pushTx(user, { amount: value, kind: 'debit', note, method });
}

export function canSpendWallet(user, amount) {
  return studentWallet(user).balance + 1e-9 >= (Number(amount) || 0);
}

export function suggestedTopUp(need) {
  const value = Math.max(0, Number(need) || 0);
  return WALLET_PACKS.find((pack) => pack >= value) || WALLET_PACKS[WALLET_PACKS.length - 1];
}

export function useStudentWallet(user) {
  const [account, setAccount] = useState(() => studentWallet(user));
  useEffect(() => {
    const refresh = () => setAccount(studentWallet(user));
    refresh();
    window.addEventListener(WALLET_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(WALLET_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [user?.id, user?.practice]);
  return account;
}
