import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import AuthModal from '@/components/AuthModal';
import MenuCard from '@/components/MenuCard';
import { Building2, ShoppingCart, X, ListOrdered, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Corporate = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const { toast } = useToast();
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [tz] = useState(process.env.REACT_APP_ORDER_TIMEZONE || 'America/Chicago');
  const isOrderingEnabled = false;

  // Ordering window: 12:05 AM (00:05) to 10:45 AM local time
  const WINDOW_START_MIN = 5; // 00:05
  const WINDOW_END_MIN = 10 * 60 + 45; // 10:45

  useEffect(() => {
    const compute = () => {
      if (!isOrderingEnabled) {
        setIsWindowOpen(false);
        return;
      }
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour12: false,
          hour: 'numeric',
          minute: 'numeric',
        }).formatToParts(new Date());
        const hh = Number(parts.find((p) => p.type === 'hour')?.value || '0');
        const mm = Number(parts.find((p) => p.type === 'minute')?.value || '0');
        const m = hh * 60 + mm;
        setIsWindowOpen(m >= WINDOW_START_MIN && m <= WINDOW_END_MIN);
      } catch {
        const d = new Date();
        const m = d.getHours() * 60 + d.getMinutes();
        setIsWindowOpen(m >= WINDOW_START_MIN && m <= WINDOW_END_MIN);
      }
    };
    compute();
    const id = setInterval(compute, 30000);
    return () => clearInterval(id);
  }, [tz]);

  useEffect(() => {
    // Initial auth check with backend
    const checkAuth = async () => {
      const API_BASE = process.env.REACT_APP_API_BASE || '';
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setIsAuthenticated(true);
          setShowAuthModal(false);
        } else {
          setShowAuthModal(true);
        }
      } catch (e) {
        setShowAuthModal(true);
      } finally {
        setLoading(false);
      }
    };
    void checkAuth();
  }, []);

  const handleAuthSuccess = () => {
    // Re-fetch current user from backend after auth
    const load = async () => {
      const API_BASE = process.env.REACT_APP_API_BASE || '';
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setIsAuthenticated(true);
          setShowAuthModal(false);
        }
      } catch {}
    };
    void load();
  };

  const handleLogout = () => {
    const run = async () => {
      const API_BASE = process.env.REACT_APP_API_BASE || '';
      try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      } catch {}
      setUser(null);
      setIsAuthenticated(false);
      setCart([]);
      setShowAuthModal(true);
      setOrderPlaced(false);
    };
    void run();
  };

  const handleAddToCart = (item) => {
    setOrderPlaced(false);
    const existingItem = cart.find((cartItem) => cartItem.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    setShowCart(true);
  };

  const handleRemoveFromCart = (itemId) => {
    setCart(cart.filter((item) => item.id !== itemId));
    setOrderPlaced(false);
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(itemId);
    } else {
      setCart(
        cart.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
    setOrderPlaced(false);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/corporate/orders', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {}
  };

  // Load corporate menu after authentication
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const loadMenu = async () => {
      const API_BASE = process.env.REACT_APP_API_BASE || '';
      try {
        const res = await fetch(`${API_BASE}/api/corporate/menu`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setMenu(data);
        }
      } catch {}
    };
    void loadMenu();
    void fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || '';
      const items = cart.map((i) => ({ itemId: i.id, quantity: i.quantity }));
      const res = await fetch(`${API_BASE}/api/corporate/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Order placed',
          description: `ID ${data.id} • Total $${Number(data.totalAmount).toFixed(2)}`,
          action: (
            <button onClick={() => setShowOrders(true)} className="underline text-sm">
              View
            </button>
          ),
        });
        setCart([]);
        setShowCart(false);
        setOrderPlaced(true);
        void fetchOrders();
      } else {
        const err = await res.json().catch(() => ({}));
        let description = err.error || 'Unknown error';
        if (err.error === 'ordering_closed' && err.available) {
          const fmt = (t) => {
            const [h, m] = String(t || '').split(':').map((x) => Number(x));
            if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
            const hours12 = ((h + 11) % 12) + 1;
            const period = h >= 12 ? 'PM' : 'AM';
            const minutes = String(m).padStart(2, '0');
            return `${hours12}:${minutes} ${period}`;
          };
          description = `Ordering available ${fmt(err.available.start)} - ${fmt(err.available.end)} (${err.available.timeZone || 'local'})`;
        }
        toast({ title: 'Checkout failed', description });
      }
    } catch (e) {
      toast({ title: 'Network error', description: 'Please try again.' });
    }
  };

  // If outside ordering window, show closed state regardless of auth
  // if (!isWindowOpen) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-saffron-50 to-maroon-50 px-4" data-testid="corporate-closed-screen">
  //       <div className="max-w-md text-center bg-white/80 backdrop-blur rounded-lg p-8 shadow">
  //         <Clock className="h-16 w-16 text-maroon-600 mx-auto mb-4" />
  //         <h1 className="font-heading text-3xl font-bold text-gray-800 mb-2">Corporate Meals Closed</h1>
  //         <p className="text-gray-700 mb-4">
  //           {isOrderingEnabled 
  //             ? `Available daily from 12:05 AM to 10:45 AM (${tz}).`
  //             : 'Corporate ordering is currently disabled.'}
  //         </p>
  //         <Button onClick={() => (window.location.href = '/')} variant="secondary">Go to Home</Button>
  //       </div>
  //     </div>
  //   );
  // }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-saffron-50 to-maroon-50 px-4" data-testid="corporate-login-screen">
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {}}
          onSuccess={handleAuthSuccess}
        />
        <div className="text-center">
          <Building2 className="h-24 w-24 text-maroon-600 mx-auto mb-4" />
          <h1 className="font-heading text-4xl font-bold text-gray-800 mb-4">
            Corporate Meals
          </h1>
          <p className="text-gray-600 text-lg">
            {loading ? 'Checking your session...' : 'Please login or sign up to access corporate meal offerings'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16" data-testid="corporate-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-maroon-700 to-maroon-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-heading text-4xl font-bold mb-2" data-testid="corporate-welcome">
                Welcome, {user?.name || user?.username}!
              </h1>
              <p className="text-gray-200 text-lg">
                Corporate Meal Offerings - Perfect for your team
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCart(!showCart)}
                variant="default"
                className="bg-saffron-500 hover:bg-saffron-600 relative"
                data-testid="cart-toggle-button"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart ({getTotalItems()})
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => setShowOrders(!showOrders)}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-maroon-900"
                data-testid="orders-toggle-button"
              >
                <ListOrdered className="h-5 w-5 mr-2" />
                Orders ({orders.length})
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-maroon-900"
                data-testid="logout-button"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowCart(false)}
          data-testid="cart-overlay"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="cart-drawer"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700"
                  data-testid="cart-close-button"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b pb-4"
                        data-testid={`cart-item-${item.id}`}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{item.name}</h3>
                          <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                            data-testid={`decrease-qty-${item.id}`}
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold" data-testid={`qty-${item.id}`}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                            data-testid={`increase-qty-${item.id}`}
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="text-red-500 hover:text-red-700"
                            data-testid={`remove-${item.id}`}
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>Total:</span>
                      <span className="text-saffron-600" data-testid="cart-total">
                        ${getTotalPrice().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleCheckout} data-testid="checkout-button">
                    Proceed to Checkout
                  </Button>
                  {orderPlaced && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                      Order placed successfully. You’ll receive a confirmation shortly.
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Menu Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {showOrders && (
          <motion.div
            id="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-gray-200 rounded-lg p-4 mb-8"
            data-testid="orders-panel"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
              <Button size="sm" variant="secondary" onClick={fetchOrders} data-testid="orders-refresh">Refresh</Button>
            </div>
            {orders.length === 0 ? (
              <p className="text-gray-600 text-sm">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="rounded border p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Order #{o.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()} • {o.items?.reduce((s,i)=>s+i.quantity,0) || 0} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-saffron-600">${o.totalAmount?.toFixed ? o.totalAmount.toFixed(2) : Number(o.totalAmount).toFixed(2)}</p>
                        <p className="text-xs uppercase tracking-wide text-gray-500">{o.status}</p>
                      </div>
                    </div>

                    {/* Items list */}
                    {Array.isArray(o.items) && o.items.length > 0 && (
                      <div className="mt-3">
                        <ul className="divide-y rounded-md border bg-gray-50">
                          {o.items.map((it) => (
                            <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                              <div className="min-w-0 pr-3">
                                <p className="text-gray-800 truncate">{it.nameSnapshot}</p>
                                <p className="text-gray-500">Qty: {it.quantity} @ ${Number(it.priceSnapshot).toFixed(2)}</p>
                              </div>
                              <div className="text-right font-medium text-gray-800">
                                ${Number(it.priceSnapshot * it.quantity).toFixed(2)}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Optional details */}
                    {(o.notes || o.deliveryAddress) && (
                      <div className="mt-3 grid gap-2 text-sm text-gray-700">
                        {o.notes && (
                          <p>
                            <span className="font-medium text-gray-800">Notes:</span> {o.notes}
                          </p>
                        )}
                        {o.deliveryAddress && (
                          <p>
                            <span className="font-medium text-gray-800">Deliver to:</span> {o.deliveryAddress}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {/* Info banner removed as requested */}

        <div className="space-y-12">
          {(menu?.categories || []).map((category, catIndex) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: catIndex * 0.1 }}
              data-testid={`corporate-category-${category.id}`}
            >
              <div className="mb-6">
                <h2 className="font-heading text-3xl font-bold text-maroon-700 mb-2">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-gray-600">{category.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.items.map((item, itemIndex) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    index={itemIndex}
                    showOrderButton={true}
                    onOrder={handleAddToCart}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Corporate;
