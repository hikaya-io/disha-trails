import type { MDXComponents } from 'mdx/types'
import Link from 'next/link'
import { Callout } from '@/components/docs/Callout'
import { DocHeading } from '@/components/docs/DocHeading'
import { DocsMedia } from '@/components/docs/DocsMedia'
import { DocsSeo } from '@/components/docs/DocsSeo'

/**
 * Components available in every .mdx file without an import. Internal links go through
 * next/link, external links open normally, and h2 and h3 get linkable anchors.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = '', children, ...props }) =>
      href.startsWith('/') || href.startsWith('#') ? (
        <Link href={href}>{children}</Link>
      ) : (
        <a href={href} {...props}>
          {children}
        </a>
      ),
    h2: (props) => <DocHeading level={2} {...props} />,
    h3: (props) => <DocHeading level={3} {...props} />,
    Callout,
    DocsMedia,
    DocsSeo,
    ...components,
  }
}
