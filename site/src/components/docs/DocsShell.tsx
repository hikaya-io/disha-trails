'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import clsx from 'clsx'

const STORAGE_KEY = 'disha-docs-sidebar'

const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
})

const iconButton =
  'flex size-11 items-center justify-center text-muted hover:text-ink focus-visible:text-ink'

/**
 * The docs page with its sidebar, from lg. The sidebar can be hidden to give the page the whole
 * width; the choice is remembered in this browser. Below lg the sidebar is never shown: the
 * header's menu button opens it as a dialog (DocsMobileNavigation).
 */
export function DocsShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === 'collapsed')
    } catch {
      // No storage (private window, blocked site data): the sidebar stays open.
    }
  }, [])

  const toggle = () =>
    setCollapsed((was) => {
      try {
        localStorage.setItem(STORAGE_KEY, was ? 'open' : 'collapsed')
      } catch {
        // Not remembered, but it still works for this page view.
      }
      return !was
    })

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <aside
        id="docs-sidebar"
        className={clsx(
          'hidden overflow-y-auto border-r border-line bg-surface px-5 pb-8 pt-2 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-60 lg:flex-col',
          collapsed ? 'lg:hidden' : 'lg:flex',
        )}
      >
        {sidebar}
      </aside>
      <div className={clsx(!collapsed && 'lg:pl-60')}>{children}</div>
    </SidebarContext.Provider>
  )
}

/** Hides the sidebar: sits in the sidebar's top row, from lg. */
export function SidebarHideButton() {
  const { toggle } = useContext(SidebarContext)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-controls="docs-sidebar"
      aria-expanded="true"
      aria-label="Hide the sidebar"
      title="Hide the sidebar"
      className={clsx(iconButton, '-mr-3')}
    >
      <PanelIcon />
    </button>
  )
}

/**
 * The header's left side. Below lg: the logo and "Docs", beside the menu button. From lg with the
 * sidebar open, the sidebar carries the logo, so only "Docs" shows; with it hidden, the button
 * that brings it back, then the logo and "Docs".
 */
export function DocsHeaderBrand({ logo }: { logo: React.ReactNode }) {
  const { collapsed, toggle } = useContext(SidebarContext)
  return (
    <span className="flex items-center gap-2 sm:gap-3">
      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-controls="docs-sidebar"
          aria-expanded="false"
          aria-label="Show the sidebar"
          title="Show the sidebar"
          className={clsx(iconButton, '-ml-3 hidden lg:flex')}
        >
          <PanelIcon />
        </button>
      )}
      <span className={clsx('items-center gap-2 sm:gap-3', collapsed ? 'flex' : 'flex lg:hidden')}>
        {logo}
        <span aria-hidden="true" className="h-5 w-px bg-line" />
      </span>
      <span className="text-sm leading-none text-muted">Docs</span>
    </span>
  )
}

/** A panel with its left column marked: the sidebar. */
function PanelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="15" />
      <path d="M9.5 4.5v15" />
    </svg>
  )
}
