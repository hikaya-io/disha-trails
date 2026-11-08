import type { CoverageState } from '@/components/coverage/useCoverageData'

/** The loading and error line for a section that waits on coverage.json. */
export function CoverageStatus({ state }: { state: Exclude<CoverageState, { status: 'ready' }> }) {
  return (
    <p role="status" className="text-base text-muted">
      {state.status === 'loading'
        ? 'Loading the latest coverage…'
        : "The coverage data didn't load. Refresh the page to try again."}
    </p>
  )
}
