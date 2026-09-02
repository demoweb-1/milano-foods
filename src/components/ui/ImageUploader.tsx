import { useRef, useState, useCallback } from 'react';
import { UploadCloud, X, ImageIcon, Loader2 } from 'lucide-react';
import { validateImageFile, ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/storage';

type UploadFn = (file: File) => Promise<string>;

type ImageUploaderProps = {
  onUpload: UploadFn;
  onUploaded: (url: string) => void;
  onError?: (message: string) => void;
  label?: string;
  hint?: string;
  className?: string;
};

export function ImageUploader({
  onUpload,
  onUploaded,
  onError,
  label = 'Upload Image',
  hint = 'JPG, PNG, WebP or GIF — max 5 MB',
  className = '',
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        onError?.(validationError);
        return;
      }
      setUploading(true);
      try {
        const url = await onUpload(file);
        onUploaded(url);
      } catch {
        const msg = 'Upload failed. Please try again.';
        setError(msg);
        onError?.(msg);
      } finally {
        setUploading(false);
      }
    },
    [onUpload, onUploaded, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors py-6 px-4 text-center ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-cream-400 hover:border-primary/50 hover:bg-cream-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-cream-200">
              <UploadCloud className="h-5 w-5 text-ink-500" />
            </div>
            <p className="text-sm font-medium text-ink-700">
              Drag & drop or <span className="text-primary">browse</span>
            </p>
            <p className="text-xs text-muted">{hint}</p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-error-600 flex items-center gap-1">
          <X className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

type MultiImageUploaderProps = {
  images: string[];
  onChange: (images: string[]) => void;
  onError?: (message: string) => void;
  max?: number;
};

export function MultiImageUploader({
  images,
  onChange,
  onError,
  max = 8,
}: MultiImageUploaderProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleUploaded = (url: string) => {
    onChange([...images, url]);
    setLocalPreview(null);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= images.length) return;
    const next = [...images];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0">Product Images</label>
        <span className="text-xs text-muted">{images.length}/{max}</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
          {images.map((url, i) => (
            <div
              key={url + i}
              className="group relative aspect-square rounded-xl overflow-hidden bg-cream-200 border border-cream-300"
            >
              <img
                src={localPreview && i === images.length - 1 ? localPreview : url}
                alt={`Product image ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute top-1 left-1 chip bg-primary text-white text-[10px] py-0.5 px-1.5">
                  Cover
                </span>
              )}
              <div className="absolute inset-0 bg-ink-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveImage(i, -1); }}
                  disabled={i === 0}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 hover:bg-white disabled:opacity-30 transition-colors"
                  aria-label="Move left"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-ink-700 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 hover:bg-error-50 transition-colors"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5 text-error-600" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveImage(i, 1); }}
                  disabled={i === images.length - 1}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 hover:bg-white disabled:opacity-30 transition-colors"
                  aria-label="Move right"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-ink-700" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < max && (
        <ImageUploader
          onUpload={async (file) => {
            const { uploadProductImage } = await import('@/lib/storage');
            setLocalPreview(URL.createObjectURL(file));
            return uploadProductImage(file);
          }}
          onUploaded={handleUploaded}
          onError={onError}
          label=""
          hint="Drag & drop or browse — JPG, PNG, WebP, GIF — max 5 MB"
        />
      )}
    </div>
  );
}
