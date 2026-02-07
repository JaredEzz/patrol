import { Page } from "@playwright/test"

export async function initialise(page: Page) {
  console.error("DEBUG initialise.ts: Starting initialisation...")
  
  // Set the flag that tells Dart we're ready
  await page.evaluate(() => {
    window.__patrol__isInitialised = true
    console.log("Patrol: __patrol__isInitialised set to true")
  })

  const timeout = process.env.PATROL_WEB_TIMEOUT ? parseInt(process.env.PATROL_WEB_TIMEOUT) : 60000
  console.error("DEBUG initialise.ts: timeout =", timeout)
  console.error("DEBUG initialise.ts: Waiting for Dart to set __patrol__onInitialised...")

  // Poll and log state periodically to help debug
  const pollInterval = setInterval(async () => {
    try {
      const state = await page.evaluate(() => ({
        hasOnInitialised: typeof window.__patrol__onInitialised === 'function',
        hasGetTests: typeof window.__patrol__getTests === 'function',
        hasRunTest: typeof window.__patrol__runTest === 'function',
      }))
      console.error("DEBUG initialise.ts: Poll state:", JSON.stringify(state))
    } catch (e) {
      // Page might be navigating or closed
    }
  }, 10000) // Log every 10 seconds

  try {
    await page.waitForFunction(
      () => {
        if (!window.__patrol__onInitialised) return false

        window.__patrol__onInitialised()
        console.log("Patrol: __patrol__onInitialised called successfully")

        return true
      },
      { timeout },
    )
    console.error("DEBUG initialise.ts: Dart initialisation complete!")
  } finally {
    clearInterval(pollInterval)
  }
}
