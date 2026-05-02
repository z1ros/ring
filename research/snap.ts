import { chromium } from "playwright";

const URL = process.env.URL ?? "http://localhost:3456/";
const OUT = process.env.OUT ?? "/tmp/ring-bg.png";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route("**/*", (r) => r.continue());
  const page = await ctx.newPage();
  const bust = `${URL}${URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
  await page.goto(bust, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT, fullPage: process.env.FULL === "1" });
  await browser.close();
  console.log("saved", OUT);
}

main();
