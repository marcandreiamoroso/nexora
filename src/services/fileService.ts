import { FileEntry } from "@/types/files";
import { Directory, File } from "expo-file-system";

function toItem(entry: FileEntry): File | Directory {
  return entry.isDirectory ? new Directory(entry.uri) : new File(entry.uri);
}

const isContentUri = (uri: string) => uri.startsWith("content://");

export function listEntries(dir: Directory): FileEntry[] {
  const entries: FileEntry[] = dir.list().map((item) =>
    item instanceof Directory
      ? { uri: item.uri, name: item.name, isDirectory: true, size: null }
      : {
          uri: item.uri,
          name: item.name,
          isDirectory: false,
          size: item.size ?? null,
        },
  );

  return entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function validateName(name: string): string | null {
  const n = name.trim();
  if (!n) return "The name cannot be empty.";
  if (n === "." || n === "..") return "That name is not allowed.";
  if (/[\\/:*?"<>|]/.test(n))
    return "The name contains characters that are not allowed.";
  return null;
}

// "photo.jpg" -> "photo (1).jpg" -> "photo (2).jpg" ... if the name is taken.
function uniqueName(dir: Directory, name: string): string {
  const existing = new Set(dir.list().map((i) => i.name.toLowerCase()));
  if (!existing.has(name.toLowerCase())) return name;

  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let n = 1;
  while (existing.has(`${base} (${n})${ext}`.toLowerCase())) n++;
  return `${base} (${n})${ext}`;
}

// Copies everything inside `src` into the already-created folder `dest`.
async function fillDirectory(src: Directory, dest: Directory): Promise<void> {
  for (const child of src.list()) {
    if (child instanceof Directory) {
      await fillDirectory(child, dest.createDirectory(child.name));
    } else {
      const copy = dest.createFile(
        child.name,
        child.type || "application/octet-stream",
      );
      copy.write(await child.bytes());
    }
  }
}

// Makes a copy of `item` inside `destDir` called `name`.
// If anything fails halfway, the half-finished copy is removed.
async function cloneAs(
  item: File | Directory,
  destDir: Directory,
  name: string,
): Promise<void> {
  if (item instanceof Directory) {
    const newDir = destDir.createDirectory(name);
    try {
      await fillDirectory(item, newDir);
    } catch (e) {
      newDir.delete();
      throw e;
    }
  } else {
    const newFile = destDir.createFile(
      name,
      item.type || "application/octet-stream",
    );
    try {
      newFile.write(await item.bytes());
    } catch (e) {
      newFile.delete();
      throw e;
    }
  }
}

export function createFolder(parent: Directory, name: string): void {
  parent.createDirectory(name.trim());
}

export async function renameEntry(
  entry: FileEntry,
  newName: string,
  parent: Directory,
): Promise<void> {
  const name = newName.trim();
  const item = toItem(entry);

  if (!isContentUri(entry.uri)) {
    item.rename(name); // normal app storage supports a real rename
    return;
  }
  await cloneAs(item, parent, name);
  item.delete(); // only reached if the copy succeeded
}

export function deleteEntry(entry: FileEntry): void {
  toItem(entry).delete();
}

export async function copyEntry(
  entry: FileEntry,
  destination: Directory,
): Promise<void> {
  const item = toItem(entry);
  await cloneAs(item, destination, uniqueName(destination, item.name));
}

export async function moveEntry(
  entry: FileEntry,
  destination: Directory,
): Promise<void> {
  const item = toItem(entry);
  await cloneAs(item, destination, uniqueName(destination, item.name));
  item.delete(); // only reached if the copy succeeded
}
