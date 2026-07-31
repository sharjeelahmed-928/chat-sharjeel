"use client";

import { useState } from "react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder,
}: Props) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error);
        setUploading(false);
        return;
    }

    onChange(data.url);
    setUploading(false);
    }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) upload(e.target.files[0]);
        }}
      />

      {uploading && <p>Uploading...</p>}

      {value && (
        <img
          src={value}
          alt=""
          className="h-16 rounded border"
        />
      )}
    </div>
  );
}