"use client";

import { DragDropUpload } from "./drag-drop-upload";

/**
 * Example usage of DragDropUpload component
 */
export function UploadExample() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Basic Upload</h2>
        <DragDropUpload
          folderName="documents"
          onUploadSuccess={(url, fileName) => {
            console.log("Upload successful:", { url, fileName });
          }}
          onUploadError={(error) => {
            console.error("Upload error:", error);
          }}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Image Upload Only</h2>
        <DragDropUpload
          acceptedFileTypes={["image/jpeg", "image/png", "image/gif", ".jpg", ".jpeg", ".png", ".gif"]}
          maxFileSize={5 * 1024 * 1024} // 5MB
          folderName="images"
          onUploadSuccess={(url, fileName) => {
            console.log("Image uploaded:", { url, fileName });
          }}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">PDF Upload Only</h2>
        <DragDropUpload
          acceptedFileTypes={["application/pdf", ".pdf"]}
          maxFileSize={10 * 1024 * 1024} // 10MB
          folderName="pdfs"
          onUploadSuccess={(url, fileName) => {
            console.log("PDF uploaded:", { url, fileName });
          }}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Multiple Files Upload</h2>
        <DragDropUpload
          multiple={true}
          acceptedFileTypes={["image/*", ".jpg", ".jpeg", ".png", ".gif"]}
          maxFileSize={5 * 1024 * 1024} // 5MB
          folderName="multiple-uploads"
          onUploadSuccess={(url, fileName) => {
            console.log("File uploaded:", { url, fileName });
          }}
        />
      </div>
    </div>
  );
}
