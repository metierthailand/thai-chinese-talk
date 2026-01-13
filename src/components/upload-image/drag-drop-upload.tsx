"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { Upload, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface DragDropUploadProps {
  /** Allowed file types (MIME types or extensions) */
  acceptedFileTypes?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Folder name in Google Drive where files will be uploaded */
  folderName?: string;
  /** Callback when upload is successful */
  onUploadSuccess?: (fileUrl: string, fileName: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Multiple file upload */
  multiple?: boolean;
  /** Custom className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function DragDropUpload({
  acceptedFileTypes = [],
  maxFileSize,
  folderName = "uploads",
  onUploadSuccess,
  onUploadError,
  multiple = false,
  className,
  disabled = false,
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (acceptedFileTypes.length > 0) {
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
        const mimeType = file.type;
        const isAccepted =
          acceptedFileTypes.some(
            (type) =>
              type.startsWith(".") && fileExtension === type.toLowerCase()
          ) ||
          acceptedFileTypes.some(
            (type) => !type.startsWith(".") && mimeType === type
          ) ||
          acceptedFileTypes.some(
            (type) => !type.startsWith(".") && mimeType.startsWith(type)
          );

        if (!isAccepted) {
          return `File type not allowed. Accepted types: ${acceptedFileTypes.join(", ")}`;
        }
      }

      // Check file size
      if (maxFileSize && file.size > maxFileSize) {
        const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
        return `File size exceeds maximum allowed size of ${maxSizeMB}MB`;
      }

      return null;
    },
    [acceptedFileTypes, maxFileSize]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        onUploadError?.(validationError);
        return;
      }

      setUploading(true);
      const fileId = `${file.name}-${Date.now()}`;
      setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderName", folderName);

        const response = await fetch("/api/upload/google-drive", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const result = await response.json();
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });

        toast.success(`File "${result.fileName}" uploaded successfully`);
        onUploadSuccess?.(result.url, result.fileName);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(errorMessage);
        onUploadError?.(errorMessage);
      } finally {
        setUploading(false);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    },
    [validateFile, folderName, onUploadSuccess, onUploadError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      if (!multiple && files.length > 1) {
        toast.error("Only one file is allowed");
        return;
      }

      files.forEach((file) => {
        uploadFile(file);
      });
    },
    [disabled, multiple, uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      if (!multiple && files.length > 1) {
        toast.error("Only one file is allowed");
        return;
      }

      files.forEach((file) => {
        uploadFile(file);
      });

      // Reset input
      e.target.value = "";
    },
    [multiple, uploadFile]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging && !disabled
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileInput}
          multiple={multiple}
          accept={acceptedFileTypes.join(",")}
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-4 text-center">
          {uploading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploading...</p>
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-1">
                    {Object.entries(uploadProgress).map(([fileId, progress]) => (
                      <div key={fileId} className="w-64">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {progress}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "rounded-full p-4",
                  isDragging && !disabled
                    ? "bg-primary/10"
                    : "bg-muted"
                )}
              >
                <Upload
                  className={cn(
                    "h-8 w-8",
                    isDragging && !disabled
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragging && !disabled
                    ? "Drop files here"
                    : "Drag and drop files here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={disabled}
              >
                <File className="h-4 w-4 mr-2" />
                Select Files
              </Button>
            </>
          )}
        </div>

        {(acceptedFileTypes.length > 0 || maxFileSize) && (
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            {acceptedFileTypes.length > 0 && (
              <p>
                Accepted types: {acceptedFileTypes.join(", ")}
              </p>
            )}
            {maxFileSize && (
              <p>Max size: {formatFileSize(maxFileSize)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
