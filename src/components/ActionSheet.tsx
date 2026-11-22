import { useTheme } from "@/hooks/use-theme";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

export type SheetAction = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  actions: SheetAction[];
  onClose: () => void;
};

export default function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: Props) {
  const t = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Tapping the dark area closes the menu */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: t.surface,
          padding: 16,
          paddingBottom: 32,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        <Text numberOfLines={1} style={{ color: t.textMuted, marginBottom: 8 }}>
          {title}
        </Text>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => {
              onClose();
              a.onPress();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
            }}
          >
            <Ionicons
              name={a.icon}
              size={22}
              color={a.destructive ? "#DC2626" : t.text}
            />
            <Text
              style={{
                marginLeft: 14,
                fontSize: 16,
                color: a.destructive ? "#DC2626" : t.text,
              }}
            >
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}
