"use client";

import { useState } from "react";

interface UploadResult {
  url: string;
  fileType: string;
  fileName: string;
  fileSize: number;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      return {
        url: data.url,
        fileType: data.fileType,
        fileName: data.fileName,
        fileSize: data.fileSize,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      console.error("File upload error:", err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultipleFiles = async (files: FileList | File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await uploadFile(files[i]);
      if (result) {
        results.push(result);
      }
    }

    return results;
  };

  const reset = () => {
    setError(null);
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    uploading,
    error,
    reset,
  };
}
