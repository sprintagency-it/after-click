import { sendIntakeReceivedEmails } from "../../_lib/email.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function getSubmittedSecret(request) {
  const url = new URL(request.url);
  return (
    url.searchParams.get("secret") ||
    request.headers.get("x-afterclick-webhook-secret") ||
    request.headers.get("x-tally-secret") ||
    ""
  );
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stringifyValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(stringifyValue).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    if ("value" in value) return stringifyValue(value.value);
    if ("text" in value) return stringifyValue(value.text);
    if ("label" in value) return stringifyValue(value.label);
    if ("name" in value) return stringifyValue(value.name);
    return JSON.stringify(value);
  }
  return String(value);
}

function looksLikeField(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  const hasLabel = ["label", "title", "name", "key", "id"].some((key) => node[key]);
  const hasValue = ["value", "answer", "response", "text"].some((key) => node[key] !== undefined && node[key] !== null);
  return hasLabel && hasValue;
}

function collectFields(payload) {
  const fields = {};
  const seen = new WeakSet();

  function addField(label, value) {
    const normalized = normalizeKey(label);
    const text = stringifyValue(value);
    if (!normalized || !text) return;
    fields[normalized] = text;
  }

  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (looksLikeField(node)) {
      const labels = [node.label, node.title, node.name, node.key, node.id].filter(Boolean);
      const value = node.value ?? node.answer ?? node.response ?? node.text;
      labels.forEach((label) => addField(label, value));
    }

    Object.entries(node).forEach(([key, value]) => {
      if (["value", "answer", "response", "text"].includes(key)) return;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        addField(key, value);
      } else {
        visit(value);
      }
    });
  }

  visit(payload);
  return fields;
}

function pick(fields, keys) {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (fields[normalized]) return fields[normalized];
  }
  return "";
}

function buildIntake(payload) {
  const fields = collectFields(payload);
  const customerEmail = pick(fields, [
    "payment_email",
    "Payment email",
    "customer_email",
    "Customer email",
    "email"
  ]);

  return {
    customerEmail,
    whatsapp: pick(fields, ["whatsapp_number", "WhatsApp number", "phone", "Phone"]),
    storeUrl: pick(fields, ["store_url", "Store URL", "website", "Website"]),
    stripeSessionId: pick(fields, ["stripe_session_id", "Stripe session ID"]),
    product: pick(fields, ["product"]),
    priceId: pick(fields, ["price_id"]),
    source: pick(fields, ["source"]),
    submittedAt: pick(fields, ["submitted_at", "created_at"]) || new Date().toISOString(),
    fieldCount: Object.keys(fields).length
  };
}

export async function onRequestPost({ request, env }) {
  if (!env.TALLY_WEBHOOK_SECRET) {
    return json({ error: "Tally webhook is not configured." }, 503);
  }

  const submittedSecret = getSubmittedSecret(request);
  if (!submittedSecret || !timingSafeEqual(submittedSecret, env.TALLY_WEBHOOK_SECRET)) {
    return json({ error: "Invalid webhook secret." }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_error) {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  const intake = buildIntake(payload);
  if (!intake.customerEmail) {
    return json({ error: "Missing customer email in intake payload.", intake }, 400);
  }

  const emailResults = await sendIntakeReceivedEmails(env, intake);

  return json({
    received: true,
    intake: {
      customerEmail: intake.customerEmail,
      whatsappPresent: Boolean(intake.whatsapp),
      storeUrl: intake.storeUrl,
      stripeSessionId: intake.stripeSessionId,
      fieldCount: intake.fieldCount
    },
    emailResults
  });
}
