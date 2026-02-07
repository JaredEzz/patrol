import { chromium, type FullConfig } from "@playwright/test"
import { initialise } from "./initialise"
import { DartTestEntry, PatrolTestEntry } from "./types"

async function setup(config: FullConfig) {
  const { baseURL, headless, locale, timezoneId } = config.projects[0].use
  
  // Get timeout from env, default to 120000ms (2 minutes)
  const timeout = process.env.PATROL_WEB_TIMEOUT ? parseInt(process.env.PATROL_WEB_TIMEOUT) : 120000
  console.error("DEBUG setup.ts: timeout =", timeout)
  console.error("DEBUG setup.ts: headless =", headless)
  console.error("DEBUG setup.ts: locale =", locale)
  console.error("DEBUG setup.ts: timezoneId =", timezoneId)
  
  // Launch browser with headless mode from config
  // Add args needed for headless Chrome in CI
  const browser = await chromium.launch({
    headless: headless ?? false,
    args: headless ? [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ] : [],
  })
  
  // Create a new context with locale settings
  const context = await browser.newContext({
    locale: locale ?? 'en-US',
    timezoneId: timezoneId ?? 'America/New_York',
  })
  const page = await context.newPage()
  
  // Set default timeout for all page operations
  page.setDefaultTimeout(timeout)
  
  // Log console messages from the browser to help debug Flutter/Dart issues
  page.on('console', msg => {
    console.error(`Browser console [${msg.type()}]: ${msg.text()}`)
  })
  
  // Log any page errors
  page.on('pageerror', error => {
    console.error('Browser page error:', error.message)
  })

  if (!baseURL) {
    throw new Error("baseURL is not set")
  }

  await page.goto(baseURL)

  await initialise(page)

  const { group: testEntries } = await page
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
    .waitForFunction(() => window.__patrol__getTests?.()!, {
      timeout,
    })
    .then(v => v.jsonValue())

  await browser.close()

  const patrolTests = mapEntry(testEntries)

  process.env.PATROL_TESTS = JSON.stringify(patrolTests)
}

function mapEntry(entry: DartTestEntry, parentName?: string, skip = false, tags = new Set<string>()) {
  const fullEntryName = parentName ? `${parentName} ${entry.name}` : entry.name
  const fullEntrySkip = skip || entry.skip
  const fullEntryTags = new Set([...tags, ...entry.tags.map(tag => `@${tag}`)])

  const tests: PatrolTestEntry[] = []

  if (entry.type === "test") {
    tests.push({
      name: fullEntryName,
      skip: fullEntrySkip,
      tags: [...fullEntryTags],
    })
  }

  tests.push(...entry.entries.flatMap(e => mapEntry(e, fullEntryName, fullEntrySkip, fullEntryTags)))

  return tests
}

export default setup
