import ActionSheet from "@/components/ActionSheet";
import TextPromptModal from "@/components/TextPromptModal";
import { useTheme } from "@/hooks/use-theme";
import {
  copyEntry,
  createFolder,
  deleteEntry,
  formatSize,
  listEntries,
  moveEntry,
  renameEntry,
  validateName,
} from "@/services/fileService";
import { FileEntry } from "@/types/files";
import { Ionicons } from "@expo/vector-icons";
import { Directory, File } from "expo-file-system";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";

const ROOT_KEY = "sharedRootUri";

type Prompt =
  | { kind: "newFolder" }
  | { kind: "rename"; entry: FileEntry }
  | null;
type Clipboard = { entry: FileEntry; mode: "copy" | "move" } | null;

export default function FilesScreen() {
  const t = useTheme();
  const [stack, setStack] = useState<Directory[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [version, setVersion] = useState(0); // bump to force a reload
  const [sheetEntry, setSheetEntry] = useState<FileEntry | null>(null);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [clipboard, setClipboard] = useState<Clipboard>(null);
  const current = stack[stack.length - 1] ?? null;

  useEffect(() => {
    const saved = Storage.getItemSync(ROOT_KEY);
    if (saved) setStack([new Directory(saved)]);
  }, []);

  useEffect(() => {
    if (!current) {
      setEntries([]);
      return;
    }
    try {
      setEntries(listEntries(current));
    } catch (e) {
      Alert.alert("Cannot open this folder", String(e));
      setStack((s) => s.slice(0, -1));
    }
  }, [current, version]);

  // Runs any file operation safely, then refreshes the list.
  const run = async (action: () => void | Promise<void>) => {
    try {
      await action();
    } catch (e) {
      Alert.alert("Something went wrong", String(e));
    }
    setVersion((v) => v + 1);
  };

  const isTaken = (name: string, ignoreUri?: string) =>
    entries.some(
      (e) =>
        e.uri !== ignoreUri &&
        e.name.toLowerCase() === name.trim().toLowerCase(),
    );

  const pickRoot = async () => {
    try {
      const dir = await Directory.pickDirectoryAsync();
      Storage.setItemSync(ROOT_KEY, dir.uri);
      setClipboard(null);
      setStack([dir]);
    } catch {
      // cancelled
    }
  };

  const open = async (entry: FileEntry) => {
    if (entry.isDirectory) {
      setStack((s) => [...s, new Directory(entry.uri)]);
      return;
    }
    try {
      const file = new File(entry.uri);
      if (await File.canPreview(file)) await File.preview(file);
      else Alert.alert("No app on this phone can open this file type");
    } catch (e) {
      Alert.alert("Could not open file", String(e));
    }
  };

  const confirmPrompt = (value: string) => {
    if (!prompt || !current) return;
    const problem = validateName(value);
    if (problem) return Alert.alert("Invalid name", problem);

    if (prompt.kind === "newFolder") {
      if (isTaken(value)) return Alert.alert("That name is already used here");
      setPrompt(null);
      run(() => createFolder(current, value));
    } else {
      if (isTaken(value, prompt.entry.uri))
        return Alert.alert("That name is already used here");
      const entry = prompt.entry;
      setPrompt(null);
      run(() => renameEntry(entry, value, current));
    }
  };

  const confirmDelete = (entry: FileEntry) => {
    Alert.alert(
      `Delete "${entry.name}"?`,
      entry.isDirectory
        ? "The folder and everything inside it will be deleted. This cannot be undone yet."
        : "This cannot be undone yet.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => run(() => deleteEntry(entry)),
        },
      ],
    );
  };

  const paste = () => {
    if (!clipboard || !current) return;
    const { entry, mode } = clipboard;
    if (entry.isDirectory && current.uri.startsWith(entry.uri)) {
      return Alert.alert("You cannot paste a folder into itself");
    }
    setClipboard(null);
    run(() =>
      mode === "copy" ? copyEntry(entry, current) : moveEntry(entry, current),
    );
  };

  if (!current) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: t.background,
        }}
      >
        <Ionicons name="folder-open-outline" size={64} color={t.secondary} />
        <Text
          style={{
            color: t.text,
            fontSize: 18,
            fontWeight: "600",
            marginTop: 16,
          }}
        >
          Choose a folder to manage
        </Text>
        <Text style={{ color: t.textMuted, textAlign: "center", marginTop: 8 }}>
          Nexora only sees the folder you pick. Nothing else on your phone is
          accessible.
        </Text>
        <Pressable
          onPress={pickRoot}
          style={{
            backgroundColor: t.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 10,
            marginTop: 24,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Choose folder
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          backgroundColor: t.surface,
        }}
      >
        {stack.length > 1 && (
          <Pressable
            onPress={() => setStack((s) => s.slice(0, -1))}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </Pressable>
        )}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 8,
            color: t.text,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          {current.name}
        </Text>
        <Pressable
          onPress={() => setPrompt({ kind: "newFolder" })}
          hitSlop={10}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="add-circle-outline" size={26} color={t.primary} />
        </Pressable>
        <Pressable onPress={pickRoot} hitSlop={10}>
          <Text style={{ color: t.primary }}>Change</Text>
        </Pressable>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.uri}
        ListEmptyComponent={
          <Text
            style={{ color: t.textMuted, textAlign: "center", marginTop: 40 }}
          >
            This folder is empty
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => open(item)}
            onLongPress={() => setSheetEntry(item)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: t.border,
            }}
          >
            <Ionicons
              name={item.isDirectory ? "folder" : "document-outline"}
              size={26}
              color={item.isDirectory ? t.primary : t.textMuted}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text numberOfLines={1} style={{ color: t.text, fontSize: 16 }}>
                {item.name}
              </Text>
              {!item.isDirectory && (
                <Text style={{ color: t.textMuted, fontSize: 12 }}>
                  {formatSize(item.size)}
                </Text>
              )}
            </View>
            <Pressable onPress={() => setSheetEntry(item)} hitSlop={12}>
              <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={t.textMuted}
              />
            </Pressable>
          </Pressable>
        )}
      />

      {clipboard && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderTopColor: t.border,
          }}
        >
          <Text numberOfLines={1} style={{ flex: 1, color: t.text }}>
            {clipboard.mode === "copy" ? "Copying" : "Moving"}:{" "}
            {clipboard.entry.name}
          </Text>
          <Pressable onPress={() => setClipboard(null)} style={{ padding: 8 }}>
            <Text style={{ color: t.textMuted }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={paste} style={{ padding: 8 }}>
            <Text style={{ color: t.primary, fontWeight: "600" }}>
              Paste here
            </Text>
          </Pressable>
        </View>
      )}

      <ActionSheet
        visible={sheetEntry !== null}
        title={sheetEntry?.name ?? ""}
        onClose={() => setSheetEntry(null)}
        actions={
          sheetEntry
            ? [
                {
                  label: "Rename",
                  icon: "create-outline",
                  onPress: () =>
                    setPrompt({ kind: "rename", entry: sheetEntry }),
                },
                {
                  label: "Copy",
                  icon: "copy-outline",
                  onPress: () =>
                    setClipboard({ entry: sheetEntry, mode: "copy" }),
                },
                {
                  label: "Move",
                  icon: "move-outline",
                  onPress: () =>
                    setClipboard({ entry: sheetEntry, mode: "move" }),
                },
                {
                  label: "Delete",
                  icon: "trash-outline",
                  destructive: true,
                  onPress: () => confirmDelete(sheetEntry),
                },
              ]
            : []
        }
      />

      <TextPromptModal
        visible={prompt !== null}
        title={prompt?.kind === "rename" ? "Rename" : "New folder"}
        initialValue={prompt?.kind === "rename" ? prompt.entry.name : ""}
        confirmLabel={prompt?.kind === "rename" ? "Rename" : "Create"}
        onConfirm={confirmPrompt}
        onCancel={() => setPrompt(null)}
      />
    </View>
  );
}
