export type FileEntry = {
  uri: string;
  name: string;
  isDirectory: boolean;
  size: number | null; // bytes; null for folders
};