import puppeteer from "puppeteer";

export async function generateCertificatePdf(html) {
  // Launch Puppeteer with sandbox flags suitable for many hosting environments.
  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    // Render the provided HTML and wait for network idle so fonts/styles load.
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
