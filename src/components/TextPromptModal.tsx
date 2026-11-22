import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  initialValue?: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export default function TextPromptModal({
  visible,
  title,
  initialValue = "",
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const t = useTheme();
  const [value, setValue] = useState(initialValue);

  // Each time the pop-up opens, reset the text box.
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{ backgroundColor: t.surface, borderRadius: 14, padding: 20 }}
        >
          <Text style={{ color: t.text, fontSize: 18, fontWeight: "600" }}>
            {title}
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            selectTextOnFocus
            autoCapitalize="none"
            style={{
              color: t.text,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 8,
              padding: 10,
              marginTop: 14,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: 18,
            }}
          >
            <Pressable onPress={onCancel} style={{ padding: 10 }}>
              <Text style={{ color: t.textMuted }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm(value)} style={{ padding: 10 }}>
              <Text style={{ color: t.primary, fontWeight: "600" }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
