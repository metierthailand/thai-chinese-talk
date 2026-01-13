import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Initialize Google Drive API client
 */
export function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
    },
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Find or create a folder in Google Drive
 * Note: Service Accounts need folders to be shared with them
 * If using a root folder ID, it will be used directly
 */
export async function findOrCreateFolder(
  drive: ReturnType<typeof getDriveClient>,
  folderName: string
): Promise<string> {
  // Clean folderName (remove query strings and handle path separators)
  const cleanFolderName = folderName.split("?")[0].trim();
  
  // If folderName is a folder ID (starts with specific pattern), use it directly
  // Google Drive folder IDs are typically alphanumeric strings
  if (/^[a-zA-Z0-9_-]{20,}$/.test(cleanFolderName)) {
    // Verify the folder exists and is accessible
    try {
      const folder = await drive.files.get({
        fileId: cleanFolderName,
        fields: "id, name, mimeType",
        supportsAllDrives: true,
      });
      if (folder.data.mimeType === "application/vnd.google-apps.folder") {
        return cleanFolderName;
      }
    } catch {
      throw new Error(
        `Folder ID "${cleanFolderName}" not found or not accessible. Make sure the folder is shared with the Service Account.`
      );
    }
  }

  // If root folder ID is specified, use it directly (don't try to create subfolders)
  // Service Accounts cannot create folders in regular folders due to quota restrictions
  let rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (rootFolderId) {
    // Clean folder ID (remove query strings like ?usp=drive_link)
    rootFolderId = rootFolderId.split("?")[0].trim();
    
    // Verify root folder is accessible
    try {
      const rootFolder = await drive.files.get({
        fileId: rootFolderId,
        fields: "id, name, mimeType",
        supportsAllDrives: true,
      });
      
      if (rootFolder.data.mimeType === "application/vnd.google-apps.folder") {
        // If folderName is just a path (like "passports/john_smith"), 
        // try to find or create subfolder, otherwise use root folder
        if (cleanFolderName.includes("/")) {
          const pathParts = cleanFolderName.split("/");
          let currentFolderId = rootFolderId;
          
          // Navigate/create each level of the path
          for (const part of pathParts) {
            if (!part.trim()) continue;
            
            // Search for existing subfolder
            const response = await drive.files.list({
              q: `name='${part}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${currentFolderId}' in parents`,
              fields: "files(id, name)",
              spaces: "drive",
              includeItemsFromAllDrives: true,
              supportsAllDrives: true,
            });
            
            if (response.data.files && response.data.files.length > 0) {
              currentFolderId = response.data.files[0].id!;
            } else {
              // Try to create subfolder (may fail for Service Accounts)
              try {
                const newFolder = await drive.files.create({
                  requestBody: {
                    name: part,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [currentFolderId],
                  },
                  fields: "id",
                  supportsAllDrives: true,
                });
                currentFolderId = newFolder.data.id!;
              } catch {
                // If can't create subfolder, use parent folder instead
                console.warn(`Cannot create subfolder "${part}", using parent folder instead`);
                break;
              }
            }
          }
          
          return currentFolderId;
        }
        
        // If folderName is not a path, use root folder directly
        return rootFolderId;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Root folder "${rootFolderId}" not accessible. Error: ${errorMsg}\n` +
        `Make sure:\n` +
        `1. The folder is shared with Service Account: ${process.env.GOOGLE_DRIVE_CLIENT_EMAIL}\n` +
        `2. The Service Account has "Editor" permission\n` +
        `3. The folder ID is correct`
      );
    }
  }

  // If no root folder is set, throw error
  throw new Error(
    `Folder "${cleanFolderName}" not found. Please set GOOGLE_DRIVE_ROOT_FOLDER_ID in .env and share the folder with the Service Account.`
  );
}

/**
 * Upload file to Google Drive
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = getDriveClient();

  // Convert Buffer to stream for Google Drive API
  const stream = Readable.from(fileBuffer);

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  // Make file publicly viewable (optional - remove if you want private files)
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    fileId: file.data.id!,
    fileUrl: file.data.webViewLink || file.data.webContentLink || "",
  };
}
