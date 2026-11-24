package expo.modules.nexoranet

import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoHTTPD.IHTTPSession
import fi.iki.elonen.NanoHTTPD.Method
import fi.iki.elonen.NanoHTTPD.Response

data class HttpRequest(
  val method: String,
  val path: String,
  val query: Map<String, List<String>>,
  val headers: Map<String, String>,
  val body: String
)

data class HttpReply(val status: Int, val body: String)

private const val MAX_BODY_BYTES = 64 * 1024

class NexoraServer(port: Int, private val handler: (HttpRequest) -> HttpReply) : NanoHTTPD(port) {

  override fun serve(session: IHTTPSession): Response {
    val length = session.headers["content-length"]?.toLongOrNull() ?: 0L
    if (length > MAX_BODY_BYTES) return reply(HttpReply(413, """{"error":"too_large"}"""))

    var body = ""
    if (session.method == Method.POST || session.method == Method.PUT) {
      try {
        val files = HashMap<String, String>()
        session.parseBody(files)
        body = files["postData"] ?: ""
      } catch (e: Exception) {
        return reply(HttpReply(400, """{"error":"bad_request"}"""))
      }
    }

    val request = HttpRequest(session.method.name, session.uri, session.parameters, session.headers, body)
    return reply(handler(request))
  }

  private fun reply(r: HttpReply): Response {
    val status = object : Response.IStatus {
      override fun getDescription() = "${r.status}"
      override fun getRequestStatus() = r.status
    }
    return newFixedLengthResponse(status, "application/json", r.body)
  }
}