import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDriveClient, findOrCreateFolder, uploadFileToDrive } from "@/lib/google-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read formData first to ensure body is fully consumed
    const formData = await req.formData();
    const file = formData.get("file");
    const folderName = (formData.get("folderName") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Handle File type (in Next.js App Router, formData.get returns File | File[] | string | null)
    if (typeof file === "string" || Array.isArray(file)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Check if file has arrayBuffer method (File/Blob interface)
    if (typeof (file as File).arrayBuffer !== "function") {
      return NextResponse.json({ error: "Invalid file type - not a File or Blob" }, { status: 400 });
    }

    // Type assertion for File
    const fileObj = file as File;
    
    // Convert File to Buffer
    const arrayBuffer = await fileObj.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = fileObj.name || "uploaded-file";
    const mimeType = fileObj.type || "application/octet-stream";

    // Get or create folder
    const drive = getDriveClient();
    const folderId = await findOrCreateFolder(drive, folderName);

    // Upload file
    const result = await uploadFileToDrive(
      buffer,
      fileName,
      mimeType,
      folderId
    );

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      fileUrl: result.fileUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error("[GOOGLE_DRIVE_UPLOAD]", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to upload file to Google Drive";
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
