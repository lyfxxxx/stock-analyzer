import { connect } from "@/client.js";

const client = await connect();
const page = await client.page("xueqiu", { viewport: { width: 1280, height: 900 } });

await page.goto("https://xueqiu.com/9363345092/363868067");
await page.waitForTimeout(3000);

console.log("Title:", await page.title());
console.log("URL:", page.url());

await page.screenshot({ path: "tmp/xueqiu-waf-check.png", fullPage: true });

const snapshot = await client.getAISnapshot("xueqiu");
console.log("Snapshot:\n", snapshot);

await client.disconnect();