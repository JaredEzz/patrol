import { Page } from "@playwright/test"

export async function initialise(page: Page) {
  await page.evaluate(() => {
    window.__patrol__isInitialised = true
  })

  const timeout = process.env.PATROL_WEB_TIMEOUT ? parseInt(process.env.PATROL_WEB_TIMEOUT) : 60000
  console.error("DEBUG: timeout =", timeout)

  await page.waitForFunction(
    () => {
      if (!window.__patrol__onInitialised) return false

      window.__patrol__onInitialised()

      return true
    },
    { timeout },
  )
}
