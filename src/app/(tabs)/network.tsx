import { useTheme } from "@/hooks/use-theme";
import type { DiscoveredDevice } from "@modules/nexora-net";
import * as NexoraNet from "@modules/nexora-net";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Switch, Text, View } from "react-native";

const PORT = 8765; // the server in step 3b will listen here

export default function NetworkScreen() {
  const t = useTheme();
  const deviceName = Device.deviceName ?? Device.modelName ?? "Android phone";

  const [ip, setIp] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const myName = useRef<string | null>(null);

  useEffect(() => {
    setIp(NexoraNet.getLocalIpAddress());

    const found = NexoraNet.addDeviceFoundListener((d) => {
      if (d.name === myName.current) return; // ignore ourselves
      setDevices((prev) => [...prev.filter((p) => p.name !== d.name), d]);
    });
    const lost = NexoraNet.addDeviceLostListener(({ name }) =>
      setDevices((prev) => prev.filter((p) => p.name !== name)),
    );
    const failed = NexoraNet.addErrorListener(({ message }) =>
      setError(message),
    );

    return () => {
      found.remove();
      lost.remove();
      failed.remove();
      NexoraNet.stopDiscovery();
      NexoraNet.stopAdvertising();
    };
  }, []);

  const toggleVisible = async (on: boolean) => {
    setError(null);
    try {
      if (on) {
        myName.current = await NexoraNet.startAdvertising(deviceName, PORT);
        setVisible(true);
      } else {
        NexoraNet.stopAdvertising();
        myName.current = null;
        setVisible(false);
      }
    } catch (e) {
      setError(String(e));
      setVisible(false);
    }
  };

  const toggleScan = () => {
    setError(null);
    if (scanning) {
      NexoraNet.stopDiscovery();
      setScanning(false);
    } else {
      setDevices([]);
      NexoraNet.startDiscovery();
      setScanning(true);
    }
  };

  const card = {
    backgroundColor: t.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.background, padding: 16 }}>
      <View style={card}>
        <Text style={{ color: t.textMuted, fontSize: 12 }}>THIS PHONE</Text>
        <Text
          style={{
            color: t.text,
            fontSize: 18,
            fontWeight: "600",
            marginTop: 4,
          }}
        >
          {deviceName}
        </Text>
        <Text style={{ color: t.textMuted, marginTop: 2 }}>
          {ip ? `Wi-Fi address: ${ip}` : "Not connected to a Wi-Fi network"}
        </Text>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}
        >
          <Text style={{ flex: 1, color: t.text }}>
            Visible to nearby devices
          </Text>
          <Switch
            value={visible}
            onValueChange={toggleVisible}
            trackColor={{ true: t.secondary }}
            thumbColor={visible ? t.primary : undefined}
          />
        </View>
      </View>

      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text
          style={{ flex: 1, color: t.text, fontSize: 16, fontWeight: "600" }}
        >
          Nearby devices
        </Text>
        <Pressable
          onPress={toggleScan}
          style={{
            backgroundColor: t.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            {scanning ? "Stop" : "Scan"}
          </Text>
        </Pressable>
      </View>

      {error && (
        <Text style={{ color: "#DC2626", marginBottom: 8 }}>{error}</Text>
      )}

      <FlatList
        data={devices}
        keyExtractor={(d) => d.name}
        ListEmptyComponent={
          <Text
            style={{ color: t.textMuted, textAlign: "center", marginTop: 32 }}
          >
            {scanning
              ? "Looking for devices..."
              : "Tap Scan to look for nearby phones"}
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              ...card,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={26}
              color={t.primary}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={{ color: t.text, fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                {item.host}:{item.port}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
