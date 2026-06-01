'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type CartContextType = {
  cartCount: number;
  ordersCount: number;
  setCartCount: (count: number) => void;
  setOrdersCount: (count: number) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  return (
    <CartContext.Provider value={{ cartCount, ordersCount, setCartCount, setOrdersCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext must be used within CartProvider');
  }
  return context;
}