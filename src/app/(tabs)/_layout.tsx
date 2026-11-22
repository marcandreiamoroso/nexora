import { useTheme } from "@/hooks/use-theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const icon =
  (name: React.ComponentProps<typeof Ionicons>["name"]) =>
  ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );

export default function TabLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.background },
        headerTintColor: t.text,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: icon("home-outline") }}
      />
      <Tabs.Screen
        name="files"
        options={{ title: "Files", tabBarIcon: icon("folder-outline") }}
      />
      <Tabs.Screen
        name="network"
        options={{ title: "Network", tabBarIcon: icon("wifi-outline") }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: "Activity", tabBarIcon: icon("time-outline") }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: icon("settings-outline") }}
      />
    </Tabs>
  );
}
