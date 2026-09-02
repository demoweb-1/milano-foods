import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Utensils, CheckCircle2, Users, Calendar, Store, Truck,
  Plus, Minus, ShoppingCart, MapPin,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Section, Reveal } from '@/components/ui/Section';
import { useBranches, useCateringItems, useSettings } from '@/lib/queries';
import { formatPrice } from '@/lib/format';
import type { CateringItem, CateringSelectedItem } from '@/types';

const cateringSchema = z.object({
  customer_name: z.string().min(2, 'Please enter your name'),
  customer_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  customer_phone: z.string().min(10, 'Enter a valid phone number'),
  organization: z.string().optional(),
  event_type: z.string().min(1, 'Please select an event type'),
  event_date: z.string().optional(),
  guest_count: z.string().optional(),
  service_type: z.string().min(1, 'Please select a service type'),
  menu_preferences: z.string().optional(),
  budget: z.string().optional(),
  fulfillment: z.enum(['delivery', 'pickup']),
  branch_id: z.string().optional(),
  delivery_address: z.string().optional(),
  special_instructions: z.string().optional(),
});

type CateringFormValues = z.infer<typeof cateringSchema>;

const eventTypes = ['Wedding', 'Corporate Event', 'Birthday Party', 'Religious Function', 'Family Gathering', 'Other'];
const serviceTypes = ['Full Catering', 'Buffet', 'Dessert Only', 'Custom Menu'];

export function CateringPage() {
  const { toast } = useToast();
  const { data: branches } = useBranches();
  const { data: cateringItems } = useCateringItems();
  const { data: settings } = useSettings();
  const [submitted, setSubmitted] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [locating, setLocating] = useState(false);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);

  const symbol = settings?.currency_symbol ?? 'Rs. ';

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CateringFormValues>({ resolver: zodResolver(cateringSchema) });

  const fulfillment = watch('fulfillment');

  const groupedItems = useMemo(() => {
    if (!cateringItems) return {} as Record<string, CateringItem[]>;
    return cateringItems.reduce((acc, item) => {
      const cat = item.category ?? 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, CateringItem[]>);
  }, [cateringItems]);

  const estimatedTotal = useMemo(() => {
    if (!cateringItems) return 0;
    return cateringItems.reduce((sum, item) => {
      const qty = selectedItems[item.id] ?? 0;
      return sum + qty * Number(item.unit_price);
    }, 0);
  }, [cateringItems, selectedItems]);

  const handleQtyChange = (itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId] ?? 0;
      const next = Math.max(0, current + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[itemId];
      else copy[itemId] = next;
      return copy;
    });
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryLat(pos.coords.latitude);
        setDeliveryLng(pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
    );
  };

  const onSubmit = async (data: CateringFormValues) => {
    try {
      const itemsPayload: CateringSelectedItem[] = cateringItems
        ? cateringItems
            .filter((item) => (selectedItems[item.id] ?? 0) > 0)
            .map((item) => ({
              item_id: item.id,
              name: item.name,
              unit_price: Number(item.unit_price),
              quantity: selectedItems[item.id],
              serves: (item.min_serves ?? 10) * selectedItems[item.id],
            }))
        : [];

      const { error } = await supabase.from('catering_requests').insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone,
        organization: data.organization || null,
        event_type: data.event_type,
        event_date: data.event_date || null,
        guest_count: data.guest_count ? Number(data.guest_count) : null,
        service_type: data.service_type,
        menu_preferences: data.menu_preferences || null,
        budget: data.budget || null,
        special_instructions: data.special_instructions || null,
        fulfillment: data.fulfillment,
        branch_id: data.branch_id || null,
        delivery_address: data.delivery_address || null,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        selected_items: itemsPayload,
        estimated_total: estimatedTotal,
      });
      if (error) throw error;
      setSubmitted(true);
      toast('Catering inquiry submitted! We will be in touch soon.');
      reset();
      setSelectedItems({});
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    }
  };

  const pickupBranches = branches?.filter((b) => b.enables_pickup ?? b.enable_pickup) ?? [];
  const deliveryBranches = branches?.filter((b) => b.enables_delivery ?? b.enable_delivery) ?? [];
  const hasItems = Object.keys(selectedItems).length > 0;

  return (
    <>
      <div className="relative bg-ink-900 text-white py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/9738993/pexels-photo-9738993.jpeg?auto=compress&cs=tinysrgb&h=800&w=1600"
            alt="Catering"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/80 to-transparent" />
        </div>
        <div className="container-x relative">
          <div className="max-w-2xl">
            <span className="section-eyebrow text-gold">
              <Utensils className="h-4 w-4" /> Catering
            </span>
            <h1 className="font-heading text-4xl lg:text-display-md font-semibold text-white mt-3">
              Catering for every occasion
            </h1>
            <p className="mt-4 text-cream-200 text-lg max-w-xl">
              Weddings, corporate events, religious functions and family gatherings —
              let us handle the food while you enjoy the moment.
            </p>
          </div>
        </div>
      </div>

      <Section className="bg-cream">
        <div className="container-x max-w-4xl">
          {submitted ? (
            <Reveal>
              <div className="card p-10 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-success-50 text-success-600 mx-auto mb-5">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="font-heading text-2xl font-semibold text-ink-900">
                  Inquiry received!
                </h2>
                <p className="mt-3 text-ink-600 max-w-md mx-auto">
                  Thank you for your catering inquiry. Our team will prepare a custom menu and
                  quote, and contact you within 24 hours.
                </p>
                <button onClick={() => setSubmitted(false)} className="btn-outline mt-6">
                  Submit another inquiry
                </button>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Menu selection */}
                {cateringItems && cateringItems.length > 0 && (
                  <div className="card p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="font-heading text-2xl font-semibold text-ink-900 mb-1">
                          Build Your Menu
                        </h2>
                        <p className="text-sm text-muted">Select items and quantities for your event.</p>
                      </div>
                      {hasItems && (
                        <div className="text-right">
                          <p className="text-xs text-muted">Estimated total</p>
                          <p className="font-heading text-xl font-bold text-primary">{formatPrice(estimatedTotal, symbol)}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-8">
                      {Object.entries(groupedItems).map(([category, items]) => (
                        <div key={category}>
                          <h3 className="font-heading text-lg font-semibold text-ink-900 mb-3">{category}</h3>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {items.map((item) => {
                              const qty = selectedItems[item.id] ?? 0;
                              return (
                                <div
                                  key={item.id}
                                  className={`rounded-xl border-2 p-4 transition-all ${qty > 0 ? 'border-primary bg-primary/5' : 'border-cream-200'}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-ink-900">{item.name}</p>
                                      {item.description && (
                                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.description}</p>
                                      )}
                                      <p className="text-sm font-semibold text-primary mt-1">
                                        {formatPrice(Number(item.unit_price), symbol)}
                                        {item.min_serves && <span className="text-xs text-muted font-normal"> / serves {item.min_serves}+</span>}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-3">
                                    <button
                                      type="button"
                                      onClick={() => handleQtyChange(item.id, -1)}
                                      disabled={qty === 0}
                                      className="grid h-8 w-8 place-items-center rounded-lg border border-cream-300 text-ink-600 hover:bg-cream-100 disabled:opacity-40 transition-colors"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="text-sm font-medium text-ink-900 w-8 text-center">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleQtyChange(item.id, 1)}
                                      className="grid h-8 w-8 place-items-center rounded-lg border border-cream-300 text-ink-600 hover:bg-cream-100 transition-colors"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact details */}
                <div className="card p-6 sm:p-8 space-y-4">
                  <h2 className="font-heading text-xl font-semibold text-ink-900">Your Details</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Your Name" error={errors.customer_name?.message}>
                      <input className="input" placeholder="John Doe" {...register('customer_name')} />
                    </Field>
                    <Field label="Phone Number" error={errors.customer_phone?.message}>
                      <input className="input" placeholder="+94 77 123 4567" {...register('customer_phone')} />
                    </Field>
                    <Field label="Email (optional)" error={errors.customer_email?.message}>
                      <input className="input" placeholder="you@email.com" {...register('customer_email')} />
                    </Field>
                    <Field label="Organization (optional)">
                      <input className="input" placeholder="Company or family name" {...register('organization')} />
                    </Field>
                    <Field label="Event Type" error={errors.event_type?.message}>
                      <select className="input" {...register('event_type')}>
                        <option value="">Select event type</option>
                        {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Service Type" error={errors.service_type?.message}>
                      <select className="input" {...register('service_type')}>
                        <option value="">Select service type</option>
                        {serviceTypes.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Event Date (optional)">
                      <input type="date" className="input" {...register('event_date')} />
                    </Field>
                    <Field label="Guest Count (optional)" error={errors.guest_count?.message}>
                      <input type="number" className="input" placeholder="e.g. 100" {...register('guest_count')} />
                    </Field>
                  </div>
                </div>

                {/* Fulfillment */}
                <div className="card p-6 sm:p-8 space-y-4">
                  <h2 className="font-heading text-xl font-semibold text-ink-900">Collection Method</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${fulfillment === 'pickup' ? 'border-primary bg-primary/5' : 'border-cream-400 hover:border-cream-500'}`}>
                      <input type="radio" value="pickup" className="sr-only" {...register('fulfillment')} />
                      <Store className="h-5 w-5 text-primary" />
                      <span className="block font-medium text-ink-900 mt-2">Pickup</span>
                      <p className="text-xs text-muted mt-0.5">Collect from our branch</p>
                    </label>
                    <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${fulfillment === 'delivery' ? 'border-primary bg-primary/5' : 'border-cream-400 hover:border-cream-500'}`}>
                      <input type="radio" value="delivery" className="sr-only" {...register('fulfillment')} />
                      <Truck className="h-5 w-5 text-primary" />
                      <span className="block font-medium text-ink-900 mt-2">Delivery</span>
                      <p className="text-xs text-muted mt-0.5">We deliver to you</p>
                    </label>
                  </div>

                  {fulfillment === 'pickup' && (
                    <Field label="Pickup Branch">
                      <select className="input" {...register('branch_id')}>
                        <option value="">Select a branch</option>
                        {pickupBranches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name} — {b.address}</option>
                        ))}
                      </select>
                    </Field>
                  )}

                  {fulfillment === 'delivery' && (
                    <>
                      <Field label="Delivery Address">
                        <textarea className="input min-h-20" placeholder="Your full delivery address" {...register('delivery_address')} />
                      </Field>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={handleUseLocation}
                          disabled={locating}
                          className="btn-outline px-4 py-2.5 text-sm flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          {locating ? 'Locating...' : 'Use my location'}
                        </button>
                        {deliveryLat != null && (
                          <span className="text-xs text-success-600 flex items-center gap-1 self-center">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Location captured
                          </span>
                        )}
                        <select className="input flex-1" {...register('branch_id')}>
                          <option value="">Auto-assign nearest branch</option>
                          {deliveryBranches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Additional info */}
                <div className="card p-6 sm:p-8 space-y-4">
                  <Field label="Budget Range (optional)">
                    <input className="input" placeholder="e.g. Rs. 50,000 – 100,000" {...register('budget')} />
                  </Field>
                  <Field label="Menu Preferences (optional)">
                    <textarea className="input min-h-20" placeholder="Any specific dishes, dietary requirements..." {...register('menu_preferences')} />
                  </Field>
                  <Field label="Special Instructions (optional)">
                    <textarea className="input min-h-24" placeholder="Anything else we should know..." {...register('special_instructions')} />
                  </Field>
                </div>

                {/* Summary bar */}
                {hasItems && (
                  <div className="sticky bottom-4 z-10">
                    <div className="card p-4 flex items-center justify-between shadow-lift bg-white">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-900">
                            {Object.values(selectedItems).reduce((a, b) => a + b, 0)} items selected
                          </p>
                          <p className="text-xs text-muted">Estimated total: {formatPrice(estimatedTotal, symbol)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-base py-4">
                  {isSubmitting ? (
                    <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Utensils className="h-5 w-5" /> Submit Catering Inquiry
                    </>
                  )}
                </button>
              </form>
            </Reveal>
          )}
        </div>
      </Section>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
}
