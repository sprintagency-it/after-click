const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function getBaseUrl(env) {
  return String(env.AFTERCLICK_PUBLIC_BASE_URL || "https://after-click.com").replace(/\/$/, "");
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

async function sendEmail(env, email) {
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

function buildShellHtml({ preheader, title, intro, body, ctaHref, ctaLabel, footer }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f6f8f5;color:#101417;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8f5;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dbe3dd;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:24px 26px;border-bottom:1px solid #dbe3dd;">
                <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#178f55;">AfterClick</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.08;color:#101417;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:26px;color:#52636b;font-size:16px;line-height:1.6;">
                <p style="margin:0 0 18px;color:#101417;">${escapeHtml(intro)}</p>
                ${body}
                ${ctaHref ? `<p style="margin:26px 0;"><a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#2fc474;color:#101417;font-weight:800;text-decoration:none;border-radius:8px;padding:14px 18px;">${escapeHtml(ctaLabel || "Continue")}</a></p>` : ""}
                <p style="margin:22px 0 0;font-size:13px;color:#6b7b83;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildBuyerOrderEmail(env, order) {
  const intakeUrl = buildIntakeUrl(env, order);
  const amount = formatMoney(order.amountTotal, order.currency);
  const subject = "Your AfterClick Revenue Map order is in";
  const preheader = "Next step: send us the store context for your map.";
  const text = [
    "Your AfterClick Revenue Map order is in.",
    "",
    `Payment received: ${amount}`,
    `Stripe session: ${order.stripeSessionId}`,
    "",
    "Next step: complete the intake form so we can prepare the map around your store URL, offer, traffic source and implementation constraints.",
    intakeUrl,
    "",
    "Delivery timing starts after the intake has enough context. Current delivery window: 48-72h after intake.",
    "",
    "Please do not submit passwords, admin access, customer lists, private dashboards, private financial records or sensitive personal data.",
    "",
    "Reply to this email if something looks wrong.",
    "",
    "AfterClick"
  ].join("\n");

  const html = buildShellHtml({
    preheader,
    title: "Your order is in.",
    intro: "Thanks for ordering your AfterClick Revenue Map.",
    ctaHref: intakeUrl,
    ctaLabel: "Complete the intake",
    body: `
      <p style="margin:0 0 14px;">We received the payment for <strong style="color:#101417;">${escapeHtml(amount)}</strong>.</p>
      <p style="margin:0 0 14px;">The next step is the intake form. That is where you send the store URL, main product, offer, traffic source, ad context and implementation constraints we need to produce the map.</p>
      <div style="margin:20px 0;padding:16px;border:1px solid #dbe3dd;border-radius:8px;background:#f8fbf8;">
        <strong style="display:block;color:#101417;margin-bottom:6px;">Delivery window</strong>
        48-72h after the intake has enough context.
      </div>
      <p style="margin:0;">Please do not submit passwords, admin access, customer lists, private dashboards, private financial records or sensitive personal data.</p>
    `,
    footer: "Reply to this email if something looks wrong. We will use the billing details entered in Stripe for invoice records."
  });

  return { subject, text, html, intakeUrl };
}

export function buildAdminOrderEmail(env, order, row, sheetSync) {
  const amount = formatMoney(order.amountTotal, order.currency);
  const intakeUrl = buildIntakeUrl(env, order);
  const instructions = order.invoiceInstructions || {};
  const dashboardUrl = `${getBaseUrl(env)}/checkout/success/?session_id=${encodeURIComponent(order.stripeSessionId)}`;
  const subject = `New AfterClick order: ${order.customerEmail || order.stripeSessionId}`;
  const text = [
    "New AfterClick Revenue Map order.",
    "",
    `Amount: ${amount}`,
    `Name: ${order.customerName || "-"}`,
    `Email: ${order.customerEmail || "-"}`,
    `Stripe session: ${order.stripeSessionId}`,
    `Payment intent: ${order.stripePaymentIntentId || "-"}`,
    `Billing country: ${row.country || order.billingCountryPreselected || "-"}`,
    `Buyer type: ${order.buyerTypePreselected || "-"}`,
    `Invoice case preliminary: ${order.invoiceCasePreliminary || "-"}`,
    `Invoice case final: ${order.invoiceCaseFinalOrPending || "-"}`,
    `Manual review: ${order.manualReview ? "yes" : "no"}`,
    `Sheet sync: ${sheetSync?.skipped ? "skipped" : "attempted"}`,
    "",
    "Invoice instruction:",
    `Recipient type: ${instructions.recipientType || "-"}`,
    `Codice destinatario: ${instructions.codiceDestinatario || "-"}`,
    `Natura IVA suggerita: ${instructions.vatNatureLikely || "-"}`,
    `Wording: ${instructions.wordingSuggestion || "-"}`,
    `Notes: ${(instructions.notes || []).join(" | ") || "-"}`,
    "",
    `Buyer intake link: ${intakeUrl}`,
    `Success page: ${dashboardUrl}`
  ].join("\n");

  const html = buildShellHtml({
    preheader: "Paid order received. Check fiscal row and intake status.",
    title: "New AfterClick order.",
    intro: `${order.customerEmail || "A buyer"} paid for the AfterClick Revenue Map.`,
    ctaHref: intakeUrl,
    ctaLabel: "Open buyer intake link",
    body: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;line-height:1.5;">
        ${[
          ["Amount", amount],
          ["Name", order.customerName || "-"],
          ["Email", order.customerEmail || "-"],
          ["Stripe session", order.stripeSessionId],
          ["Payment intent", order.stripePaymentIntentId || "-"],
          ["Country", row.country || order.billingCountryPreselected || "-"],
          ["Buyer type", order.buyerTypePreselected || "-"],
          ["Invoice case", order.invoiceCaseFinalOrPending || "-"],
          ["Manual review", order.manualReview ? "yes" : "no"],
          ["Sheet sync", sheetSync?.skipped ? "skipped" : "attempted"]
        ].map(([label, value]) => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #e8eee9;color:#6b7b83;">${escapeHtml(label)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e8eee9;color:#101417;font-weight:700;">${escapeHtml(value)}</td>
          </tr>
        `).join("")}
      </table>
      <div style="margin-top:18px;padding:16px;border:1px solid #dbe3dd;border-radius:8px;background:#f8fbf8;">
        <strong style="display:block;color:#101417;margin-bottom:6px;">Fiscal notes</strong>
        <p style="margin:0 0 8px;">${escapeHtml(instructions.wordingSuggestion || "-")}</p>
        <p style="margin:0;">${escapeHtml((instructions.notes || []).join(" | ") || "-")}</p>
      </div>
    `,
    footer: "Paid Orders should be matched later with the Tally intake by email and stripe_session_id."
  });

  return { subject, text, html };
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

  if (env.AFTERCLICK_ADMIN_EMAIL) {
    const admin = buildAdminOrderEmail(env, order, row, sheetSync);
    try {
      results.push({
        type: "admin_paid_order",
        result: await sendEmail(env, {
          to: [env.AFTERCLICK_ADMIN_EMAIL],
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
