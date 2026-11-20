// Loaded only into the second, loopback-only QA process.
const original = globalThis.fetch;
const target = "https://script.google.com/macros/s/LOCAL_BROWSER_FIXTURE/exec";
process.env.GOOGLE_SCRIPT_URL = target;
process.env.GOOGLE_SCRIPT_TOKEN = "local-fixture-only";
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url || input.href;
  if (url === target) {
    const order = JSON.parse(init.body);
    if (order.token !== "local-fixture-only" || !order.name.startsWith("TEST"))
      throw Error("Invalid test fixture");
    if (order.name === "TEST failure") return Response.json({ ok: false });
    if (order.name === "TEST timeout")
      throw new DOMException("timed out", "TimeoutError");
    return Response.json({ ok: true });
  }
  if (url.startsWith("https://script.google.com/"))
    throw Error("Unexpected upstream in local QA");
  return original(input, init);
};
