import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3456/?t=${Date.now()}`, { waitUntil: "networkidle" });

  const result = await page.evaluate(() => {
    const sec = document.querySelector("main > section");
    if (!sec) return { error: "no section" };
    const bgDiv = sec.querySelector("div");
    const cs = bgDiv ? window.getComputedStyle(bgDiv) : null;
    const secCs = window.getComputedStyle(sec);
    return {
      sectionBg: secCs.backgroundColor,
      sectionBgImage: secCs.backgroundImage,
      bgDivClass: bgDiv?.className,
      bgDivBgImage: cs?.backgroundImage,
      bgDivZ: cs?.zIndex,
      bgDivPosition: cs?.position,
      bgDivVisible: cs ? `${cs.display}/${cs.visibility}/${cs.opacity}` : null,
      bgDivRect: bgDiv?.getBoundingClientRect(),
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      htmlBg: window.getComputedStyle(document.documentElement).backgroundColor,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main();
