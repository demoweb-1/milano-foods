import type { Product, Settings } from '@/types';
import { Heart, Eye, Plus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { useWishlist } from '@/lib/wishlist-context';
import { useToast } from '@/components/ui/Toast';
import { formatPrice } from '@/lib/format';

type ProductCardProps = {
  product: Product;
  settings?: Settings | null;
  onQuickView?: (product: Product) => void;
  index?: number;
};

export function ProductCard({ product, settings, onQuickView, index = 0 }: ProductCardProps) {
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const { toast } = useToast();
  const [added, setAdded] = useState(false);
  const symbol = settings?.currency_symbol ?? 'Rs. ';
  const isWishlisted = has(product.id);

  const image = product.images[0] ?? '';
  const hasDiscount = product.discount_price != null && product.discount_price > 0;
  const displayPrice = hasDiscount ? product.discount_price! : product.price;

  const badgeLabels: Record<string, string> = {
    'best-seller': 'Best Seller',
    popular: 'Popular',
    new: 'New',
    featured: 'Featured',
  };
  const topBadge = product.badges.find((b) => badgeLabels[b]);

  const stockColor: Record<string, string> = {
    in_stock: 'text-success-600 bg-success-50',
    low_stock: 'text-warning-600 bg-warning-50',
    out_of_stock: 'text-error-600 bg-error-50',
    preorder: 'text-gold-600 bg-gold-50',
  };
  const stockLabel: Record<string, string> = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Sold Out',
    preorder: 'Pre-Order',
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock_status === 'out_of_stock') return;
    add({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price: displayPrice,
      image,
      quantity: 1,
    });
    toast(`${product.name} added to cart`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
    toast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist', 'info');
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.24), ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/products/${product.slug}`}
        className="group card overflow-hidden flex flex-col h-full hover:shadow-lift hover:-translate-y-1.5 relative"
      >
        <div className="relative aspect-square overflow-hidden bg-cream-200">
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[800ms] ease-smooth group-hover:scale-110"
          />
          {/* Shine sweep on hover */}
          <div className="shine-sweep" />
          {/* Subtle gradient overlay at bottom for depth */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {topBadge && (
              <span className="chip bg-primary text-white shadow-soft text-[10px] px-2 py-0.5">{badgeLabels[topBadge]}</span>
            )}
            {hasDiscount && (
              <span className="chip bg-gold text-ink-900 shadow-soft text-[10px] px-2 py-0.5">
                {Math.round((1 - product.discount_price! / product.price) * 100)}% Off
              </span>
            )}
          </div>
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleWishlist}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/90 backdrop-blur text-ink-700 hover:text-primary hover:bg-white shadow-soft transition-colors"
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-primary text-primary' : ''}`} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleQuickView}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/90 backdrop-blur text-ink-700 hover:text-primary hover:bg-white shadow-soft transition-colors"
              aria-label="Quick view"
            >
              <Eye className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <span className="text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wide truncate">
              {product.category?.name ?? 'Bakery'}
            </span>
            <span className={`chip ${stockColor[product.stock_status]} text-[10px] px-2 py-0.5 shrink-0`}>
              {stockLabel[product.stock_status]}
            </span>
          </div>
          <h3 className="font-heading text-sm sm:text-base font-semibold text-ink-900 leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>

          <div className="mt-auto pt-3 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="font-heading text-base sm:text-lg font-semibold text-ink-900 truncate">
                {formatPrice(displayPrice, symbol)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted line-through hidden sm:inline">
                  {formatPrice(product.price, symbol)}
                </span>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.08 }}
              onClick={handleAdd}
              disabled={product.stock_status === 'out_of_stock'}
              className="grid h-9 w-9 place-items-center rounded-full bg-ink-900 text-white hover:bg-primary transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none shrink-0 relative"
              aria-label={`Add ${product.name} to cart`}
            >
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="h-4.5 w-4.5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="plus"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
