import { chromium, type FullConfig } from "@playwright/test"
import { initialise } from "./initialise"
import { DartTestEntry, PatrolTestEntry } from "./types"

async function setup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  const browser = await chromium.launch()
  const page = await browser.newPage()

  if (!baseURL) {
    throw new Error("baseURL is not set")
  }

  await page.goto(baseURL)

  await initialise(page)

  const timeout = process.env.PATROL_WEB_TIMEOUT ? parseInt(process.env.PATROL_WEB_TIMEOUT) : 120000

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
