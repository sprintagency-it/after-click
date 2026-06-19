const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asText(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.map(asText).filter((item) => item !== "-").join(", ") || "-";
  if (typeof value === "object") {
    if ("text" in value) return asText(value.text);
    if ("label" in value) return asText(value.label);
    if ("value" in value) return asText(value.value);
    return JSON.stringify(value);
  }
  return String(value);
}

function formatMoney(amount, currency) {
  const numeric = Number(amount || 0) / 100;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: String(currency || "USD").toUpperCase()
  }).format(numeric);
}

function getFromEmail(env) {
  return env.AFTERCLICK_FROM_EMAIL || "AfterClick <updates@updates.after-click.com>";
}

function getReplyToEmail(env) {
  return env.AFTERCLICK_REPLY_TO_EMAIL || "support@after-click.com";
}

function getFirstName(name) {
  const clean = String(name || "").trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0];
}

function getAdminEmail(env) {
  return env.AFTERCLICK_ADMIN_EMAIL || "";
}

function getBaseUrl(env) {
  return String(env.AFTERCLICK_PUBLIC_BASE_URL || "https://after-click.com").replace(/\/$/, "");
}

function formatAddress(address = {}) {
  const parts = [
    address.line1,
    address.line2,
    address.postal_code,
    address.city,
    address.state,
    address.country
  ].filter(Boolean);
  return parts.join(", ") || "-";
}

function formatTaxIds(taxIds = []) {
  if (!Array.isArray(taxIds) || taxIds.length === 0) return "-";
  return taxIds.map((taxId) => `${taxId.type || "tax_id"}: ${taxId.value || "-"}`).join(" | ");
}

function formatCustomFields(customFields = []) {
  if (!Array.isArray(customFields) || customFields.length === 0) return "-";
  return customFields
    .map((field) => `${field.key || field.name || "field"}: ${field.value || field.text || "-"}`)
    .join(" | ");
}

function plainKeyValues(items) {
  return items.map(([label, value]) => `${label}: ${asText(value)}`).join("\n");
}

function htmlKeyValues(items) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin:18px 0;font-size:14px;line-height:1.45;">
    ${items.map(([label, value]) => `
      <tr>
        <td style="border-bottom:1px solid #e7ece8;padding:8px 8px 8px 0;color:#65757c;vertical-align:top;width:38%;">${escapeHtml(label)}</td>
        <td style="border-bottom:1px solid #e7ece8;padding:8px 0;color:#101417;vertical-align:top;font-weight:600;">${escapeHtml(asText(value))}</td>
      </tr>
    `).join("")}
  </table>`;
}

function paragraphsToHtml(paragraphs) {
  return paragraphs
    .filter((paragraph) => paragraph !== undefined && paragraph !== null && paragraph !== "")
    .map((paragraph) => `<p style="margin:0 0 14px;">${escapeHtml(paragraph)}</p>`)
    .join("");
}

function buildTransactionalFooterText(contactEmail = "support@after-click.com") {
  return [
    "This is a transactional email related to your AfterClick Revenue Map. No newsletter subscription was created.",
    `The automated sending address is not monitored. For support, corrections, or to opt out of non-essential follow-up emails, contact ${contactEmail}.`
  ].join(" ");
}

function buildTransactionalFooterHtml(contactEmail = "support@after-click.com") {
  const encodedEmail = encodeURIComponent(contactEmail);
  return `<p style="margin:24px 0 0;color:#65757c;font-size:13px;line-height:1.5;">
    This is a transactional email related to your AfterClick Revenue Map. No newsletter subscription was created.<br>
    The automated sending address is not monitored. For support, corrections, or to opt out of non-essential follow-up emails, contact
    <a href="mailto:${encodedEmail}" style="color:#101417;text-decoration:underline;">${escapeHtml(contactEmail)}</a>.
  </p>`;
}

function buildSimpleHtml({ preheader, title, paragraphs, ctaHref, ctaLabel, detailsHtml = "", footer, footerHtml }) {
  const cta = ctaHref
    ? `<p style="margin:22px 0;"><a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#2fc474;color:#101417;text-decoration:none;font-weight:700;border-radius:7px;padding:12px 16px;">${escapeHtml(ctaLabel || "Continue")}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#ffffff;color:#101417;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || "")}</div>
    <main style="max-width:620px;margin:0 auto;padding:28px 18px;font-size:16px;line-height:1.55;">
      <p style="margin:0 0 18px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#178f55;font-weight:700;">AfterClick</p>
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.18;color:#101417;">${escapeHtml(title)}</h1>
      ${paragraphsToHtml(paragraphs)}
      ${detailsHtml}
      ${cta}
      ${footerHtml || `<p style="margin:24px 0 0;color:#65757c;font-size:13px;line-height:1.5;">${escapeHtml(footer || buildTransactionalFooterText())}</p>`}
    </main>
  </body>
</html>`;
}

export async function sendEmail(env, email) {
  if (!env.RESEND_API_KEY) {
    return { skipped: true, reason: "missing_RESEND_API_KEY" };
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: email.from || getFromEmail(env),
      to: email.to,
      reply_to: email.replyTo || getReplyToEmail(env),
      subject: email.subject,
      text: email.text,
      html: email.html,
      tags: email.tags || []
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Resend error ${response.status}`);
  }

  return { ok: true, id: payload.id || "" };
}

export function buildIntakeUrl(env, order) {
  const intakeUrl = new URL(env.TALLY_INTAKE_URL || "https://tally.so/r/2EVX9V");

  if (order?.stripeSessionId) intakeUrl.searchParams.set("stripe_session_id", order.stripeSessionId);
  if (order?.customerEmail) intakeUrl.searchParams.set("payment_email", order.customerEmail);
  intakeUrl.searchParams.set("product", "afterclick_revenue_map");
  intakeUrl.searchParams.set("price_id", env.AFTERCLICK_REVENUE_MAP_PRICE_ID || "price_1TjhLmEbWnBWRyMCQHDtMpVi");
  intakeUrl.searchParams.set("source", "order_email");

  return intakeUrl.toString();
}

export function buildBuyerOrderEmail(env, order) {
  const intakeUrl = buildIntakeUrl(env, order);
  const amount = formatMoney(order.amountTotal, order.currency);
  const contactEmail = getReplyToEmail(env);
  const greeting = getFirstName(order.customerName) ? `Hi ${getFirstName(order.customerName)},` : "Hi,";
  const subject = "Your AfterClick Revenue Map order is in";
  const preheader = "Next step: complete the intake so we can start the map.";
  const text = [
    greeting,
    "",
    "Thanks for ordering your AfterClick Revenue Map.",
    "",
    `Payment received: ${amount}`,
    "",
    "The next step is to complete the intake form so we can review the right store, offer, traffic context and implementation constraints.",
    "",
    `Complete the intake: ${intakeUrl}`,
    "",
    "If you already completed the intake from the success page, you can ignore this step.",
    "",
    "Delivery timing starts after the intake is complete. Current delivery window: 48-72 hours after we have the context we need.",
    "",
    "Please do not send passwords, admin access, customer lists, private dashboards, private financial records or sensitive personal data.",
    "",
    "To make sure you receive the finished map, add support@after-click.com and updates@updates.after-click.com to your contacts or safe sender list.",
    "",
    buildTransactionalFooterText(contactEmail),
    "",
    "AfterClick"
  ].join("\n");

  const html = buildSimpleHtml({
    preheader,
    title: "Your AfterClick Revenue Map order is in",
    paragraphs: [
      greeting,
      "Thanks for ordering your AfterClick Revenue Map.",
      `Payment received: ${amount}`,
      "The next step is to complete the intake form so we can review the right store, offer, traffic context and implementation constraints.",
      "If you already completed the intake from the success page, you can ignore this step.",
      "Delivery timing starts after the intake is complete. Current delivery window: 48-72 hours after we have the context we need.",
      "Please do not send passwords, admin access, customer lists, private dashboards, private financial records or sensitive personal data.",
      "To make sure you receive the finished map, add support@after-click.com and updates@updates.after-click.com to your contacts or safe sender list."
    ],
    ctaHref: intakeUrl,
    ctaLabel: "Complete the intake",
    footerHtml: buildTransactionalFooterHtml(contactEmail)
  });

  return { subject, preheader, text, html, intakeUrl };
}

export function buildAdminOrderEmail(env, order, row = {}, sheetSync = {}) {
  const amount = formatMoney(order.amountTotal, order.currency);
  const intakeUrl = buildIntakeUrl(env, order);
  const instructions = order.invoiceInstructions || {};
  const successUrl = `${getBaseUrl(env)}/checkout/success/?session_id=${encodeURIComponent(order.stripeSessionId)}`;
  const subject = `New AfterClick order: ${order.customerEmail || order.stripeSessionId}`;
  const fiscalItems = [
    ["Amount", amount],
    ["Name", order.customerName || "-"],
    ["Email", order.customerEmail || "-"],
    ["Stripe session", order.stripeSessionId],
    ["Payment intent", order.stripePaymentIntentId || "-"],
    ["Stripe customer", order.stripeCustomerId || "-"],
    ["Billing country", row.country || order.billingCountryPreselected || order.billingAddress?.country || "-"],
    ["Billing address", formatAddress(order.billingAddress)],
    ["Buyer type", order.buyerTypePreselected || "-"],
    ["Invoice case preliminary", order.invoiceCasePreliminary || "-"],
    ["Invoice case final", order.invoiceCaseFinalOrPending || "-"],
    ["Tax IDs", formatTaxIds(order.taxIds)],
    ["Custom fields", formatCustomFields(order.customFields)],
    ["Manual review", order.manualReview ? "yes" : "no"],
    ["Manual review reason", order.manualReviewReason || "-"],
    ["Sheet sync", sheetSync?.skipped ? `skipped: ${sheetSync.reason || "-"}` : "attempted"],
    ["Recipient type", instructions.recipientType || "-"],
    ["Codice destinatario", instructions.codiceDestinatario || "-"],
    ["Natura IVA suggested", instructions.vatNatureLikely || "-"],
    ["Invoice wording", instructions.wordingSuggestion || "-"],
    ["Invoice notes", Array.isArray(instructions.notes) ? instructions.notes.join(" | ") : "-"],
    ["Buyer intake link", intakeUrl],
    ["Success page", successUrl]
  ];

  const text = [
    "New AfterClick Revenue Map order.",
    "",
    plainKeyValues(fiscalItems),
    "",
    "Invoice/manual review note: check Stripe billing details and the Paid Orders row before issuing the invoice."
  ].join("\n");

  const html = buildSimpleHtml({
    preheader: "Paid order received. Check fiscal data and intake status.",
    title: "New AfterClick order",
    paragraphs: [
      "New AfterClick Revenue Map order.",
      "Check the fiscal data below before issuing the invoice. Match the order with Tally later by email and stripe_session_id."
    ],
    detailsHtml: htmlKeyValues(fiscalItems),
    ctaHref: intakeUrl,
    ctaLabel: "Open buyer intake link",
    footer: "Internal email. Do not forward to the buyer."
  });

  return { subject, text, html };
}

export function buildBuyerIntakeReceivedEmail(_env, intake) {
  const subject = "We received your AfterClick intake";
  const preheader = "Your Revenue Map is now in the delivery queue.";
  const contactEmail = getReplyToEmail(_env);
  const text = [
    "Hi,",
    "",
    "Thanks - we received your AfterClick intake.",
    "",
    "We will review your public store journey together with the context you submitted. The current delivery window is 48-72 hours from complete intake.",
    "",
    intake?.storeUrl ? `Store URL received: ${intake.storeUrl}` : "",
    "",
    "If we need one extra detail, we will contact you by email or WhatsApp using the contact details you submitted.",
    "",
    "To avoid missing the delivery email, add support@after-click.com and updates@updates.after-click.com to your contacts or safe sender list.",
    "",
    "You do not need to send passwords, admin access, customer lists or private dashboards.",
    "",
    buildTransactionalFooterText(contactEmail),
    "",
    "AfterClick"
  ].filter((line) => line !== undefined && line !== null).join("\n");

  const html = buildSimpleHtml({
    preheader,
    title: "We received your AfterClick intake",
    paragraphs: [
      "Hi,",
      "Thanks - we received your AfterClick intake.",
      "We will review your public store journey together with the context you submitted. The current delivery window is 48-72 hours from complete intake.",
      intake?.storeUrl ? `Store URL received: ${intake.storeUrl}` : "",
      "If we need one extra detail, we will contact you by email or WhatsApp using the contact details you submitted.",
      "To avoid missing the delivery email, add support@after-click.com and updates@updates.after-click.com to your contacts or safe sender list.",
      "You do not need to send passwords, admin access, customer lists or private dashboards."
    ],
    footerHtml: buildTransactionalFooterHtml(contactEmail)
  });

  return { subject, preheader, text, html };
}

export function buildBuyerReportReadyEmail(_env, delivery) {
  const subject = "Your AfterClick Revenue Map is ready";
  const preheader = "Here are the HTML, PDF and Markdown versions of your map.";
  const contactEmail = getReplyToEmail(_env);
  const htmlReportUrl = delivery?.htmlReportUrl || "{HTML_REPORT_URL}";
  const pdfUrl = delivery?.pdfUrl || "{PDF_URL}";
  const markdownUrl = delivery?.markdownUrl || "{MARKDOWN_URL}";
  const greeting = getFirstName(delivery?.name) ? `Hi ${getFirstName(delivery.name)},` : "Hi,";
  const text = [
    greeting,
    "",
    "Your AfterClick Revenue Map is ready.",
    "",
    `HTML report: ${htmlReportUrl}`,
    `PDF export: ${pdfUrl}`,
    `Markdown file: ${markdownUrl}`,
    "",
    "Suggested order:",
    "1. Review the HTML version first.",
    "2. Share the PDF with teammates or stakeholders.",
    "3. Use the Markdown file with your AI tools, implementation notes or internal planning docs.",
    "",
    "The map focuses on the highest-priority after-click gaps we found from your public journey and intake context. It is diagnostic guidance, not a revenue, ROAS, conversion or profit guarantee.",
    "",
    `If you want help scoping the fixes, contact ${contactEmail} and we can look at whether an AfterClick Fix Sprint makes sense.`,
    "",
    buildTransactionalFooterText(contactEmail),
    "",
    "AfterClick"
  ].join("\n");

  const detailsHtml = htmlKeyValues([
    ["HTML report", htmlReportUrl],
    ["PDF export", pdfUrl],
    ["Markdown file", markdownUrl]
  ]);

  const html = buildSimpleHtml({
    preheader,
    title: "Your AfterClick Revenue Map is ready",
    paragraphs: [
      greeting,
      "Your AfterClick Revenue Map is ready.",
      "Suggested order: review the HTML version first, share the PDF with teammates or stakeholders, then use the Markdown file with AI tools, implementation notes or internal planning docs.",
      "The map focuses on the highest-priority after-click gaps we found from your public journey and intake context. It is diagnostic guidance, not a revenue, ROAS, conversion or profit guarantee.",
      `If you want help scoping the fixes, contact ${contactEmail} and we can look at whether an AfterClick Fix Sprint makes sense.`
    ],
    detailsHtml,
    ctaHref: htmlReportUrl,
    ctaLabel: "Open the HTML report",
    footerHtml: buildTransactionalFooterHtml(contactEmail)
  });

  return { subject, preheader, text, html };
}

export async function sendOrderEmails(env, order, row, sheetSync) {
  const results = [];

  if (order.customerEmail) {
    const buyer = buildBuyerOrderEmail(env, order);
    try {
      results.push({
        type: "buyer_order_received",
        result: await sendEmail(env, {
          to: [order.customerEmail],
          subject: buyer.subject,
          text: buyer.text,
          html: buyer.html,
          tags: [
            { name: "project", value: "afterclick" },
            { name: "email_type", value: "order_received" }
          ]
        })
      });
    } catch (error) {
      results.push({ type: "buyer_order_received", error: error.message || String(error) });
    }
  }

  if (getAdminEmail(env)) {
    const admin = buildAdminOrderEmail(env, order, row, sheetSync);
    try {
      results.push({
        type: "admin_paid_order",
        result: await sendEmail(env, {
          to: [getAdminEmail(env)],
          subject: admin.subject,
          text: admin.text,
          html: admin.html,
          tags: [
            { name: "project", value: "afterclick" },
            { name: "email_type", value: "admin_paid_order" }
          ]
        })
      });
    } catch (error) {
      results.push({ type: "admin_paid_order", error: error.message || String(error) });
    }
  } else {
    results.push({ type: "admin_paid_order", skipped: true, reason: "missing_AFTERCLICK_ADMIN_EMAIL" });
  }

  return results;
}

export async function sendIntakeReceivedEmails(env, intake) {
  const results = [];

  if (!intake.customerEmail) {
    return [{ type: "buyer_intake_received", skipped: true, reason: "missing_customer_email" }];
  }

  const buyer = buildBuyerIntakeReceivedEmail(env, intake);
  try {
    results.push({
      type: "buyer_intake_received",
      result: await sendEmail(env, {
        to: [intake.customerEmail],
        subject: buyer.subject,
        text: buyer.text,
        html: buyer.html,
        tags: [
          { name: "project", value: "afterclick" },
          { name: "email_type", value: "intake_received" }
        ]
      })
    });
  } catch (error) {
    results.push({ type: "buyer_intake_received", error: error.message || String(error) });
  }

  return results;
}
