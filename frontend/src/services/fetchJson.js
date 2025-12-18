export default async function fetchJson(url, options = {}) {
  const resp = await fetch(url, options);
  const text = await resp.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (e) {
    // If server returned HTML (e.g., Next.js 404 page), produce a clearer error message
    const isHtml = typeof text === 'string' && text.trim().startsWith('<');
    json = { message: isHtml ? `Unexpected HTML response (status ${resp.status})` : text };
  }
  if (!resp.ok) {
    const err = new Error(json?.message || 'Request failed');
    err.status = resp.status;
    err.body = json;
    throw err;
  }
  return json;
}
