import createMDX from '@next/mdx'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the site is served as plain files from Cloudflare Pages.
  output: 'export',
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
