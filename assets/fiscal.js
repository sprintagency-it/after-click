(function () {
  var EU_COUNTRIES = {
    AT: true, BE: true, BG: true, HR: true, CY: true, CZ: true, DK: true, EE: true,
    FI: true, FR: true, DE: true, GR: true, HU: true, IE: true, LV: true, LT: true,
    LU: true, MT: true, NL: true, PL: true, PT: true, RO: true, SK: true, SI: true,
    ES: true, SE: true
  };

  function normalizeCountry(country) {
    return String(country || "").trim().toUpperCase();
  }

  function isValidCountryCode(country) {
    return /^[A-Z]{2}$/.test(normalizeCountry(country));
  }

  function classifyPreliminary(country, buyerType) {
    var c = normalizeCountry(country);

    if (c === "SM") return "SAN_MARINO_MANUAL_REVIEW";
    if (c === "IT") return buyerType === "business" ? "IT_BUSINESS" : "IT_INDIVIDUAL";
    if (EU_COUNTRIES[c]) return buyerType === "business" ? "EU_BUSINESS_VAT_PENDING" : "EU_INDIVIDUAL";
    return buyerType === "business" ? "EXTRA_EU_BUSINESS" : "EXTRA_EU_INDIVIDUAL";
  }

  function getPublicInvoiceNote(invoiceCase) {
    if (invoiceCase === "IT_INDIVIDUAL") {
      return "For Italian individual buyers, the payment step will request the details needed for invoice handling.";
    }

    if (invoiceCase === "IT_BUSINESS") {
      return "For Italian business or professional buyers, the payment step will request billing details and supported tax information.";
    }

    if (invoiceCase === "EU_BUSINESS_VAT_PENDING") {
      return "For EU business buyers, the payment step will request supported VAT details where available.";
    }

    if (invoiceCase === "SAN_MARINO_MANUAL_REVIEW") {
      return "This billing country may require a manual review before payment.";
    }

    return "The payment step will use the billing details entered there to prepare payment and invoice records.";
  }

  window.AfterClickFiscal = {
    normalizeCountry: normalizeCountry,
    isValidCountryCode: isValidCountryCode,
    classifyPreliminary: classifyPreliminary,
    getPublicInvoiceNote: getPublicInvoiceNote
  };
})();
