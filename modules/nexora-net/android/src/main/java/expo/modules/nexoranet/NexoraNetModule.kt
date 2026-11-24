package expo.modules.nexoranet

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import androidx.core.os.bundleOf
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.Inet4Address
import java.net.NetworkInterface
import fi.iki.elonen.NanoHTTPD
import org.json.JSONObject
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

private val pending = ConcurrentHashMap<String, CompletableFuture<Pair<Int, String>>>()
private val idCounter = AtomicLong()
private var server: NexoraServer? = null
private const val SERVICE_TYPE = "_nexora._tcp."

class NexoraNetModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  private val nsd: NsdManager
    get() = context.getSystemService(Context.NSD_SERVICE) as NsdManager

  private var multicastLock: WifiManager.MulticastLock? = null
  private var registrationListener: NsdManager.RegistrationListener? = null
  private var discoveryListener: NsdManager.DiscoveryListener? = null

  // Android can resolve only one service at a time, so we queue them.
  private val resolveQueue = ArrayDeque<NsdServiceInfo>()
  private var resolving = false

  override fun definition() = ModuleDefinition {
    Name("NexoraNet")

    Events("onDeviceFound", "onDeviceLost", "onError", "onRequest")

    Function("getLocalIpAddress") {
      findLocalIp()
    }

    Function("startServer") { port: Int ->
  server?.stop()
  val s = NexoraServer(port) { req ->
    val id = idCounter.incrementAndGet().toString()
    val future = CompletableFuture<Pair<Int, String>>()
    pending[id] = future
    sendEvent(
      "onRequest",
      bundleOf(
        "id" to id,
        "method" to req.method,
        "path" to req.path,
        "query" to JSONObject(req.query).toString(),
        "headers" to JSONObject(req.headers).toString(),
        "body" to req.body
      )
    )
    try {
      val (status, body) = future.get(10, TimeUnit.SECONDS)
      HttpReply(status, body)
    } catch (e: Exception) {
      HttpReply(504, """{"error":"app_did_not_answer"}""")
    } finally {
      pending.remove(id)
    }
  }
  s.start(NanoHTTPD.SOCKET_READ_TIMEOUT, true)
  server = s
  s.listeningPort
}

    Function("respondToRequest") { id: String, status: Int, body: String ->
      pending[id]?.complete(Pair(status, body))
      Unit
    }

    Function("stopServer") {
      server?.stop()
      server = null
    }

    Function("isServerRunning") {
      server?.isAlive == true
    }

    AsyncFunction("startAdvertising") { name: String, port: Int, promise: Promise ->
      stopAdvertisingInternal()
      acquireMulticastLock()

      val info = NsdServiceInfo().apply {
        serviceName = name
        serviceType = SERVICE_TYPE
        setPort(port)
      }
      val listener = object : NsdManager.RegistrationListener {
        override fun onServiceRegistered(registered: NsdServiceInfo) {
          // Android may change the name (e.g. "Pixel (2)") if it is taken.
          promise.resolve(registered.serviceName)
        }
        override fun onRegistrationFailed(info: NsdServiceInfo, errorCode: Int) {
          registrationListener = null
          promise.reject("ERR_ADVERTISE", "Could not start advertising (code $errorCode)", null)
        }
        override fun onServiceUnregistered(info: NsdServiceInfo) {}
        override fun onUnregistrationFailed(info: NsdServiceInfo, errorCode: Int) {}
      }
      registrationListener = listener
      nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, listener)
    }

    Function("stopAdvertising") {
      stopAdvertisingInternal()
      releaseLockIfIdle()
    }

    Function("startDiscovery") {
      stopDiscoveryInternal()
      acquireMulticastLock()

      val listener = object : NsdManager.DiscoveryListener {
        override fun onDiscoveryStarted(type: String) {}
        override fun onDiscoveryStopped(type: String) {}
        override fun onStartDiscoveryFailed(type: String, errorCode: Int) {
          sendEvent("onError", bundleOf("message" to "Discovery failed to start (code $errorCode)"))
        }
        override fun onStopDiscoveryFailed(type: String, errorCode: Int) {}
        override fun onServiceFound(info: NsdServiceInfo) {
          enqueueResolve(info)
        }
        override fun onServiceLost(info: NsdServiceInfo) {
          sendEvent("onDeviceLost", bundleOf("name" to info.serviceName))
        }
      }
      discoveryListener = listener
      nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, listener)
    }

    Function("stopDiscovery") {
      stopDiscoveryInternal()
      releaseLockIfIdle()
    }

    OnDestroy {
      server?.stop()
      stopAdvertisingInternal()
      stopDiscoveryInternal()
      releaseLockIfIdle()
    }
  }

  

  // ---------- helpers ----------

  private fun findLocalIp(): String? {
    val candidates = NetworkInterface.getNetworkInterfaces().toList()
      .filter { it.isUp && !it.isLoopback }
      .flatMap { nif -> nif.inetAddresses.toList().map { nif.name to it } }
      .filter { (_, addr) -> addr is Inet4Address && addr.isSiteLocalAddress }

    // Prefer Wi-Fi (wlan*) or hotspot (ap*, swlan*) interfaces.
    val preferred = candidates.firstOrNull { (name, _) ->
      name.startsWith("wlan") || name.startsWith("ap") || name.startsWith("swlan")
    }
    return (preferred ?: candidates.firstOrNull())?.second?.hostAddress
  }

  private fun acquireMulticastLock() {
    if (multicastLock?.isHeld == true) return
    val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    multicastLock = wifi.createMulticastLock("nexora-multicast").apply {
      setReferenceCounted(false)
      acquire()
    }
  }

  private fun releaseLockIfIdle() {
    if (registrationListener == null && discoveryListener == null) {
      multicastLock?.let { if (it.isHeld) it.release() }
      multicastLock = null
    }
  }

  private fun stopAdvertisingInternal() {
    registrationListener?.let {
      try { nsd.unregisterService(it) } catch (_: Exception) {}
    }
    registrationListener = null
  }

  private fun stopDiscoveryInternal() {
    discoveryListener?.let {
      try { nsd.stopServiceDiscovery(it) } catch (_: Exception) {}
    }
    discoveryListener = null
    synchronized(resolveQueue) {
      resolveQueue.clear()
      resolving = false
    }
  }

  private fun enqueueResolve(info: NsdServiceInfo) {
    synchronized(resolveQueue) { resolveQueue.addLast(info) }
    resolveNext()
  }

  private fun resolveNext() {
    val next = synchronized(resolveQueue) {
      if (resolving || resolveQueue.isEmpty()) null
      else {
        resolving = true
        resolveQueue.removeFirst()
      }
    } ?: return

    nsd.resolveService(next, object : NsdManager.ResolveListener {
      override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {
        finishResolve()
      }
      override fun onServiceResolved(info: NsdServiceInfo) {
        val host = info.host?.hostAddress
        if (host != null) {
          sendEvent(
            "onDeviceFound",
            bundleOf("name" to info.serviceName, "host" to host, "port" to info.port)
          )
        }
        finishResolve()
      }
    })
  }

  private fun finishResolve() {
    synchronized(resolveQueue) { resolving = false }
    resolveNext()
  }
}