import { useTheme } from "@/hooks/use-theme";
import { Text, View } from "react-native";

export default function PlaceholderScreen({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.background,
      }}
    >
      <Text style={{ color: t.text, fontSize: 22, fontWeight: "600" }}>
        {title}
      </Text>
    </View>
  );
}
