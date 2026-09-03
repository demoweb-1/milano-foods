import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Clock, Package, Truck, Store,
  XCircle, MapPin, Phone, Search, AlertCircle, Timer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Section } from '@/components/ui/Section';
import { formatPrice, formatDateTime, timeAgo } from '@/lib/format';
import { useSettings } from '@/lib/queries';
import type { Order, OrderStatus, TrackingEvent } from '@/types';

const TRACKABLE_STATUSES: OrderStatus[] = [
  'pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled',
];

const statusSteps: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
  { status: 'pending', label: 'Order Placed', icon: Clock },
  { status: 'accepted', label: 'Accepted', icon: CheckCircle2 },
  { status: 'preparing', label: 'Preparing', icon: Package },
  { status: 'ready', label: 'Ready', icon: Store },
  { status: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const statusColors: Record<string, string> = {
  pending: 'bg-warning-50 text-warning-600 border-warning-200',
  accepted: 'bg-blue-50 text-blue-600 border-blue-200',
  preparing: 'bg-gold/20 text-gold-700 border-gold/30',
  ready: 'bg-success-50 text-success-600 border-success-200',
  out_for_delivery: 'bg-blue-50 text-blue-600 border-blue-200',
  completed: 'bg-cream-200 text-ink-600 border-cream-300',
  cancelled: 'bg-error-50 text-error-600 border-error-200',
};

export function OrderTrackingPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id') ?? '';
  const { toast } = useToast();
  const { data: settings } = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchNumber, setSearchNumber] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const symbol = settings?.currency_symbol ?? 'Rs. ';

  const fetchOrder = useCallback(async (id: string) => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, branch:branches(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      toast('Could not load order', 'error');
    } else {
      setOrder(data as Order | null);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchOrder(orderId);
  }, [orderId, fetchOrder]);

  // Realtime subscription
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order-${order.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        () => fetchOrder(order.id),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order?.id, fetchOrder]);

  const handleSearch = () => {
    if (!searchNumber.trim()) return;
    fetchOrder(searchNumber.trim());
  };

  const canCancel = order && order.status === 'pending';

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        notes: [order.notes, 'CANCELLED BY CUSTOMER'].filter(Boolean).join(' — '),
      })
      .eq('id', order.id);
    setCancelling(false);
    if (error) {
      toast('Could not cancel order. Please call us.', 'error');
    } else {
      toast('Order cancelled successfully');
      fetchOrder(order.id);
    }
  };

  // Check if within 5 minutes of order creation
  const isWithin5Min = order && (() => {
    const created = new Date(order.created_at).getTime();
    return Date.now() - created < 5 * 60 * 1000;
  })();

  if (!orderId) {
    return (
      <Section className="bg-cream min-h-[60vh] flex items-center">
        <div className="container-x max-w-md text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-cream-200 mx-auto mb-5">
            <Search className="h-9 w-9 text-ink-300" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900">Track Your Order</h1>
          <p className="text-muted mt-2 mb-6">Enter your order number to see its live status.</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="e.g. MF-20260901-1234"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="btn-primary px-5">
              <Search className="h-4 w-4" /> Track
            </button>
          </div>
        </div>
      </Section>
    );
  }

  if (loading) {
    return (
      <Section className="bg-cream min-h-[60vh] flex items-center">
        <div className="container-x text-center">
          <span className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
          <p className="text-sm text-muted mt-3">Loading your order...</p>
        </div>
      </Section>
    );
  }

  if (!order) {
    return (
      <Section className="bg-cream min-h-[60vh] flex items-center">
        <div className="container-x max-w-md text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-error-50 mx-auto mb-5">
            <AlertCircle className="h-9 w-9 text-error-500" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900">Order not found</h1>
          <p className="text-muted mt-2 mb-6">We couldn't find an order with that number. Please check and try again.</p>
          <Link to="/" className="btn-outline"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
        </div>
      </Section>
    );
  }

  if (order.status === 'cancelled') {
    return (
      <Section className="bg-cream min-h-[60vh] flex items-center">
        <div className="container-x max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 text-center"
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-error-50 text-error-600 mx-auto mb-5">
              <XCircle className="h-8 w-8" />
            </div>
            <h1 className="font-heading text-2xl font-semibold text-ink-900">Order Cancelled</h1>
            <p className="mt-3 text-ink-600">
              Your order {order.order_number} has been cancelled.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/products" className="btn-primary">Browse Products</Link>
              <Link to="/" className="btn-outline">Back to Home</Link>
            </div>
          </motion.div>
        </div>
      </Section>
    );
  }

  const currentStepIdx = statusSteps.findIndex((s) => s.status === order.status);
  const isDelivery = order.fulfillment === 'delivery';

  return (
    <Section className="bg-cream">
      <div className="container-x max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        {/* Order header */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-ink-900">{order.order_number}</h1>
              <p className="text-sm text-muted mt-1">Placed {formatDateTime(order.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`chip border ${statusColors[order.status]} capitalize`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Cancellation window */}
          {canCancel && isWithin5Min && (
            <div className="mt-5 rounded-xl bg-warning-50 border border-warning-200 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-warning-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning-700">You can still cancel this order</p>
                  <p className="text-xs text-warning-600">Orders can only be cancelled within 5 minutes of placement.</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-sm font-medium text-error-600 hover:bg-error-50 rounded-lg px-3 py-2 transition-colors shrink-0"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          )}
        </div>

        {/* Tracking timeline */}
        <div className="card p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold text-ink-900 mb-6">Order Progress</h2>
          <div className="relative">
            {statusSteps.map((step, idx) => {
              const isDone = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              const isDeliveryStep = step.status === 'ready' && isDelivery;
              const stepLabel = isDeliveryStep ? 'Out for Delivery' : step.label;
              const StepIcon = isDeliveryStep ? Truck : step.icon;
              return (
                <div key={step.status} className="flex gap-4 pb-8 last:pb-0 relative">
                  {/* Connector line */}
                  {idx < statusSteps.length - 1 && (
                    <div className={`absolute left-5 top-10 bottom-0 w-0.5 ${isDone ? 'bg-primary' : 'bg-cream-300'}`} />
                  )}
                  <div className={`relative grid h-10 w-10 place-items-center rounded-full shrink-0 transition-all ${isDone ? 'bg-primary text-white' : 'bg-cream-200 text-ink-400'} ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="pt-1.5">
                    <p className={`font-medium ${isDone ? 'text-ink-900' : 'text-ink-400'}`}>{stepLabel}</p>
                    {isCurrent && order.status === 'pending' && (
                      <p className="text-xs text-warning-600 mt-0.5">Waiting for confirmation</p>
                    )}
                    {isCurrent && order.status === 'accepted' && (
                      <p className="text-xs text-blue-600 mt-0.5">Your order has been accepted</p>
                    )}
                    {isCurrent && order.status === 'preparing' && order.estimated_prep_time && (
                      <p className="text-xs text-gold-700 mt-0.5">Est. {order.estimated_prep_time} min prep time</p>
                    )}
                    {isCurrent && order.status === 'ready' && !isDelivery && (
                      <p className="text-xs text-success-600 mt-0.5">Ready for pickup!</p>
                    )}
                    {isCurrent && order.status === 'ready' && isDelivery && (
                      <p className="text-xs text-blue-600 mt-0.5">On the way to you</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tracking history */}
          {order.tracking_history && order.tracking_history.length > 0 && (
            <div className="mt-6 pt-6 border-t border-cream-200">
              <p className="text-sm font-medium text-ink-900 mb-3">History</p>
              <div className="space-y-2">
                {(order.tracking_history as TrackingEvent[]).map((evt, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-muted">
                    <span className="capitalize">{evt.status.replace(/_/g, ' ')}</span>
                    <span>{timeAgo(evt.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order details */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Customer info */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-ink-900">Customer</h3>
            <p className="text-sm text-ink-700">{order.customer_name}</p>
            <a href={`tel:${order.customer_phone}`} className="text-sm text-primary flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
            </a>
            <div className="flex items-start gap-1.5 text-sm text-ink-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="capitalize">{order.fulfillment}</p>
                {order.delivery_address && <p>{order.delivery_address}</p>}
                {order.branch && order.fulfillment === 'pickup' && (
                  <p>{order.branch.name} — {order.branch.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className="card p-5 space-y-2 text-sm">
            <h3 className="font-semibold text-ink-900">Summary</h3>
            <div className="flex justify-between text-ink-600">
              <span>Subtotal</span><span>{formatPrice(Number(order.subtotal), symbol)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-success-600">
                <span>Discount</span><span>-{formatPrice(Number(order.discount), symbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-600">
              <span>Delivery</span><span>{formatPrice(Number(order.delivery_fee), symbol)}</span>
            </div>
            <div className="flex justify-between font-heading font-semibold text-ink-900 pt-2 border-t border-cream-200">
              <span>Total</span><span>{formatPrice(Number(order.total), symbol)}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Items</h3>
          <div className="space-y-3">
            {order.line_items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover bg-cream-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{item.name}</p>
                  <p className="text-xs text-muted">{item.quantity} × {formatPrice(item.price, symbol)}</p>
                </div>
                <span className="text-sm font-semibold text-ink-900">{formatPrice(item.price * item.quantity, symbol)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
