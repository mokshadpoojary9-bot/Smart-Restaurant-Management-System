import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const add = (menuItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.item_id === menuItem.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, {
        item_id: menuItem.id, name: menuItem.name, price: menuItem.price,
        qty: 1, image_url: menuItem.image_url, notes: "",
      }];
    });
  };
  const setQty = (item_id, qty) => {
    setItems((p) => p.map((i) => i.item_id === item_id ? { ...i, qty: Math.max(1, qty) } : i));
  };
  const remove = (item_id) => setItems((p) => p.filter((i) => i.item_id !== item_id));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
