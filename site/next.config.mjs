import createMDX from '@next/mdx'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the site is served as plain files from GitHub Pages (.github/workflows/deploy-site.yml).
  output: 'export',
  // "/disha-trails" on hikaya-io.github.io, empty at a domain root. src/lib/site.ts reads it too.
  basePath: (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, ''),
  // A check build can write elsewhere (NEXT_DIST_DIR=.next-check yarn build), so it doesn't
  // overwrite the .next folder a running `yarn dev` serves from.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  images: { unoptimized: true },
}

// Plugins are passed as function references, which works with webpack only (see the
// nextjs-mdx skill, "The pipeline"). Revisit before moving to Next.js 16 and Turbopack.
const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
  },
})

export default withMDX(nextConfig)
