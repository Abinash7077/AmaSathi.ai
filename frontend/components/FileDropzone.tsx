"use client";

import { useRef, useState } from "react";

export default function FileDropzone({
  onFileSelected,
  accept = "image/*,application/pdf,video/*",
  label = "Upload or capture an image/PDF/video",
}: {
  onFileSelected: (file: File) => void;
  accept?: string;
  label?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewName(file.name);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
    onFileSelected(file);
  }

  return (
    <div className="border-2 border-dashed border-brand-500/40 rounded-xl p-5 bg-white">
      <p className="text-sm text-slate-600 mb-3">{label}</p>

      <div className="flex gap-3 flex-wrap">
        {/* Capture directly from phone camera */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
        >
          📷 Capture Photo
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {/* Pick any file (image/pdf/video) from device */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-lg border border-brand-600 text-brand-700 text-sm font-medium hover:bg-brand-50 transition"
        >
          📁 Choose File (Image / PDF / Video)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {previewName && (
        <div className="mt-4">
          {previewUrl && (
            <img src={previewUrl} alt="preview" className="max-h-48 rounded-lg border mb-2" />
          )}
          <p className="text-xs text-slate-500">Selected: {previewName}</p>
        </div>
      )}
    </div>
  );
}
