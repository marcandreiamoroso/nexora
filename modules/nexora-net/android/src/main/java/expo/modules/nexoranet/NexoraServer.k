package expo.modules.nexoranet

import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoHTTPD.IHTTPSession
import fi.iki.elonen.NanoHTTPD.Method
import fi.iki.elonen.NanoHTTPD.Response
import org.json.JSONObject

class NexoraServer(port: Int, private val deviceName: String) : NanoHTTPD(port) {

  override fun serve(session: IHTTPSession): Response {
    return when {
      session.method == Method.GET && session.uri == "/ping" ->
        json(
          Response.Status.OK,
          JSONObject()
            .put("app", "nexora")
            .put("protocol", 1)
            .put("name", deviceName)
        )

      else -> json(Response.Status.NOT_FOUND, JSONObject().put("error", "not_found"))
    }
  }

  private fun json(status: Response.IStatus, body: JSONObject): Response =
    newFixedLengthResponse(status, "application/json", body.toString())
}