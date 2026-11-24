import { requireNativeModule } from "expo";

const NexoraNet = requireNativeModule("NexoraNet");

export type DiscoveredDevice = { name: string; host: string; port: number };

export function getLocalIpAddress(): string | null {
  return NexoraNet.getLocalIpAddress();
}

// Resolves with the name actually registered (Android may add " (2)").
export function startAdvertising(name: string, port: number): Promise<string> {
  return NexoraNet.startAdvertising(name, port);
}
export function stopAdvertising(): void {
  NexoraNet.stopAdvertising();
}
export function startDiscovery(): void {
  NexoraNet.startDiscovery();
}
export function stopDiscovery(): void {
  NexoraNet.stopDiscovery();
}

export function addDeviceFoundListener(cb: (d: DiscoveredDevice) => void) {
  return NexoraNet.addListener("onDeviceFound", cb);
}
export function addDeviceLostListener(cb: (d: { name: string }) => void) {
  return NexoraNet.addListener("onDeviceLost", cb);
}
export function addErrorListener(cb: (e: { message: string }) => void) {
  return NexoraNet.addListener("onError", cb);
}
// Starts the HTTP server. Returns the port it is listening on.
export function startServer(port: number, deviceName: string): number {
  return NexoraNet.startServer(port, deviceName);
}
export function stopServer(): void {
  NexoraNet.stopServer();
}
export function isServerRunning(): boolean {
  return NexoraNet.isServerRunning();
}
