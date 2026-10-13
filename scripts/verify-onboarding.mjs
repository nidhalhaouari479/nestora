import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const output = "artifacts/onboarding";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: "block" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of ["/", "/welcome", "/auth", "/verify", "/onboarding/university"]) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, route);
      await page.screenshot({ path: `${output}/${viewport.width}-${route.slice(1).replace("/", "-") || "splash"}.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Overflow on ${route}`);
    }
    assert.deepEqual(errors, [], "Browser errors");
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/auth`);
  await page.getByLabel("Nom", { exact: true }).fill("Ben Salah");
  await page.getByLabel("Prénom", { exact: true }).fill("Mariem");
  await page.getByLabel("Email", { exact: true }).fill("mariem@email.com");
  await page.getByRole("radio", { name: "Femme" }).click();
  assert.equal(await page.getByRole("radio", { name: "Femme" }).getAttribute("aria-checked"), "true");
  await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
  await page.getByLabel("Confirmer le mot de passe").fill("autre-chose");
  await page.getByLabel("Téléphone").fill("22345678");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByText("Les deux mots de passe ne correspondent pas.").waitFor();
  // Sending the real email code needs Supabase SMTP; the verify screen is checked with a saved profile instead.
  await page.goto(`${baseUrl}/verify`);
  await page.waitForURL("**/auth/login");
  await page.evaluate(() => localStorage.setItem("nestora:onboarding-profile", JSON.stringify({ firstName: "Mariem", lastName: "Ben Salah", email: "mariem@email.com" })));
  await page.goto(`${baseUrl}/verify`);
  await page.getByText("mariem@email.com", { exact: true }).waitFor();
  await page.getByLabel("Code de vérification").fill("12ab34");
  assert.equal(await page.getByLabel("Code de vérification").inputValue(), "1234");
  await page.screenshot({ path: `${output}/390-verify-email.png`, fullPage: true });
  await page.goto(`${baseUrl}/onboarding/university`);
  await page.getByPlaceholder("Rechercher une université").fill("ihec");
  await page.getByRole("radio", { name: /IHEC Carthage/ }).click();
  assert.equal(await page.getByRole("radio", { name: /IHEC Carthage/ }).getAttribute("aria-checked"), "true");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.waitForURL("**/explore");
  for (const route of ["/explore", "/explore/filters", "/search?type=s0", "/logements/studio-lumineux-el-manar-2", "/logements/studio-lumineux-el-manar-2/visite"]) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200, route);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Overflow on ${route}`);
  }
  for (const day of await page.locator(".date-option").all().then((days) => days.slice(0, 3))) await day.click();
  await page.getByRole("button", { name: "Envoyer mes 3 disponibilités" }).waitFor();
  for (const asset of ["welcome.png", "auth.png", "tunis.png"]) {
    const response = await context.request.get(`${baseUrl}/images/${asset}`);
    assert.equal(response.status(), 200, `Image ${asset}`);
    assert.match(response.headers()["content-type"], /image/);
  }
  await context.close();
  console.log(`Onboarding and discovery verified at 320px, 390px, and 1440px. Screenshots: ${output}`);
} finally {
  await browser.close();
}
