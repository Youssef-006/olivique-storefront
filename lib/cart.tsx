"use client";
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cleanCart, maxQty, productById, type Line } from "./catalog";

const key = "olivique-cart";
const empty: Line[] = [];
let lines: Line[] = empty;
let initialized = false;
const listeners = new Set<() => void>();
function read() {
  try {
    return cleanCart(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return empty;
  }
}
function snapshot() {
  if (!initialized) {
    lines = read();
    initialized = true;
  }
  return lines;
}
function synced(e: StorageEvent) {
  if (e.key === key || e.key === null) {
    lines = read();
    listeners.forEach((fn) => fn());
  }
}
function subscribe(fn: () => void) {
  if (!listeners.size) window.addEventListener("storage", synced);
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (!listeners.size) window.removeEventListener("storage", synced);
  };
}
function save(next: Line[]) {
  lines = cleanCart(next);
  try {
    localStorage.setItem(key, JSON.stringify(lines));
  } catch {}
  listeners.forEach((fn) => fn());
}
function quantity(id: string, qty: number) {
  save(
    snapshot().flatMap((line) =>
      line.id !== id ? [line] : qty > 0 ? [{ id, qty }] : [],
    ),
  );
}
const Context = createContext<{
  lines: Line[];
  count: number;
  add: (id: string, qty?: number) => void;
  quantity: typeof quantity;
  clear: () => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  pulse: number;
} | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, snapshot, () => empty);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  function add(id: string, qty = 1) {
    if (!productById.has(id)) return;
    const contents = snapshot();
    const existing = contents.find((line) => line.id === id);
    if (existing) quantity(id, Math.min(maxQty, existing.qty + qty));
    else save([...contents, { id, qty }]);
    setPulse((n) => n + 1);
  }
  return (
    <Context.Provider
      value={{
        lines: current,
        count: current.reduce((n, l) => n + l.qty, 0),
        add,
        quantity,
        clear: () => save([]),
        open,
        setOpen,
        pulse,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCart() {
  const cart = useContext(Context);
  if (!cart) throw new Error("CartProvider required");
  return cart;
}
