/*
# Create Storage Buckets for Product Images and Logo

1. New Storage Buckets
- `product-images` (public) — stores product photos uploaded from the admin panel
- `site-assets` (public) — stores bakery logo and other site branding assets

2. Security
- Both buckets are public (readable by anyone without auth) so images display on the storefront
- Write access is restricted to authenticated users (admins) only
- Policies: SELECT for anon+authenticated, INSERT/UPDATE/DELETE for authenticated only

3. Important Notes
- Product images uploaded from Admin Products page are stored in `product-images/`
- Bakery logo uploaded from Admin Settings page is stored in `site-assets/logo`
- The logo file path is overwritten on each new upload so only one logo file exists at a time
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- product-images: public read, authenticated write
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_authed_insert" ON storage.objects;
CREATE POLICY "product_images_authed_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_authed_update" ON storage.objects;
CREATE POLICY "product_images_authed_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_authed_delete" ON storage.objects;
CREATE POLICY "product_images_authed_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- site-assets: public read, authenticated write
DROP POLICY IF EXISTS "site_assets_public_read" ON storage.objects;
CREATE POLICY "site_assets_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "site_assets_authed_insert" ON storage.objects;
CREATE POLICY "site_assets_authed_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "site_assets_authed_update" ON storage.objects;
CREATE POLICY "site_assets_authed_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-assets')
WITH CHECK (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "site_assets_authed_delete" ON storage.objects;
CREATE POLICY "site_assets_authed_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-assets');
