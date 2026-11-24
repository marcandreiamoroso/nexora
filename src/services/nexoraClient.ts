export type PingReply = { app: string; protocol: number; name: string };

export async function pingDevice(
  target: { host: string; port: number },
  timeoutMs = 4000,
): Promise<PingReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://${target.host}:${target.port}/ping`, {
      signal: controller.signal,
    });
    if (!res.ok)
      throw new Error(`The device answered with error ${res.status}`);
    const data = await res.json();
    if (data.app !== "nexora")
      throw new Error("That device is not running Nexora");
    return data as PingReply;
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw new Error("The device did not answer in time");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
