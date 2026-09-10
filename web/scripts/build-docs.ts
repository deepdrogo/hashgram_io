/**
 * Builds the documentation from the repository's docs/ directory plus the
 * web-native pages in web/content/. Output:
 *   src/generated/docs-index.json   nav, metadata and per-section text for search
 *   public/docs-content/<slug>.json rendered HTML + TOC, fetched on demand
 *
 * Missing docs/ (e.g. building web/ outside the repo) is not an error: only the
 * web-native pages are emitted and a warning is printed.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolink from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root as HastRoot, Element } from 'hast';
import type { Root as MdRoot } from 'mdast';
import GithubSlugger from 'github-slugger';

const WEB = resolve(new URL('..', import.meta.url).pathname);
const DOCS_DIR = process.env.DOCS_DIR ? resolve(process.env.DOCS_DIR) : resolve(WEB, '../docs');
const CONTENT_DIR = join(WEB, 'content');
const OUT_INDEX = join(WEB, 'src/generated/docs-index.json');
const OUT_CONTENT = join(WEB, 'public/docs-content');

/** Ordered list from the site spec; anything else in docs/ follows alphabetically. */
const ORDER = [
  'ARCHITECTURE',
  'PROTOCOL',
  'TOKENOMICS',
  'SERVICE_REWARDS',
  'DECENTRALIZATION',
  'MAINNET',
  'OPERATIONS',
  'NODE_ROLES',
  'CLIENT_CONNECTIVITY_SPEC',
  'SOCIAL_PROTOCOL',
  'MESSAGING',
  'CALLS',
  'STORAGE',
  'MODERATION',
  'SECURITY',
  'THREAT_MODEL',
  'DISASTER_RECOVERY',
  'LOGGING_POLICY',
];
const EXCLUDE = [/^PROMPT_/i, /_KA\.md$/i, /^FOUNDER_LAUNCH_RUNBOOK/i, /^PHASE1_REPORT/i, /^FINAL_REPORT/i, /^README\.md$/i];

/** Web-native pages, shown first in the nav. */
const NATIVE: Array<{ file: string; slug: string; group: string }> = [
  { file: 'what-is-hashgram.md', slug: 'what-is-hashgram', group: 'Start here' },
  { file: 'run-a-node.md', slug: 'run-a-node', group: 'Start here' },
  { file: 'api.md', slug: 'api', group: 'Start here' },
  { file: 'explorer-guide.md', slug: 'explorer-guide', group: 'Using the site' },
  { file: 'short-links.md', slug: 'short-links', group: 'Using the site' },
  { file: 'faq.md', slug: 'faq', group: 'Using the site' },
  { file: 'glossary.md', slug: 'glossary', group: 'Using the site' },
];

const GROUPS: Record<string, string> = {
  ARCHITECTURE: 'Protocol',
  PROTOCOL: 'Protocol',
  TOKENOMICS: 'Economics',
  SERVICE_REWARDS: 'Economics',
  DECENTRALIZATION: 'Network',
  MAINNET: 'Network',
  OPERATIONS: 'Operations',
  NODE_ROLES: 'Operations',
  CLIENT_CONNECTIVITY_SPEC: 'Protocol',
  SOCIAL_PROTOCOL: 'Social layer',
  MESSAGING: 'Social layer',
  CALLS: 'Social layer',
  STORAGE: 'Social layer',
  MODERATION: 'Social layer',
  SECURITY: 'Security',
  THREAT_MODEL: 'Security',
  DISASTER_RECOVERY: 'Operations',
  LOGGING_POLICY: 'Security',
};

interface TocItem {
  depth: number;
  id: string;
  text: string;
}
interface Section {
  id: string;
  page: string;
  heading: string;
  anchor: string;
  text: string;
}
interface PageMeta {
  slug: string;
  title: string;
  group: string;
  source: string;
  commit: string | null;
  modified: string | null;
  words: number;
  description: string;
}

function slugify(name: string): string {
  return name
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/_/g, '-');
}

function gitInfo(file: string): { commit: string | null; modified: string | null } {
  try {
    const out = execSync(`git log -1 --format=%H%x09%cI -- "${basename(file)}"`, { cwd: resolve(file, '..'), stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (!out) throw new Error('untracked');
    const [commit, modified] = out.split('\t');
    return { commit: commit ?? null, modified: modified ?? null };
  } catch {
    return { commit: null, modified: new Date(statSync(file).mtimeMs).toISOString() };
  }
}

/** Rewrite links between docs (`./TOKENOMICS.md#x`, `TOKENOMICS.md`) to site routes. */
function rehypeDocLinks(known: Set<string>) {
  return () => (tree: HastRoot) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string') return;
      const m = /^(?:\.\.?\/)?(?:docs\/)?([A-Za-z0-9_\-]+)\.md(#.*)?$/.exec(href);
      if (m) {
        const slug = slugify(m[1]!);
        node.properties!.href = known.has(slug) ? `/docs/${slug}${m[2] ?? ''}` : href;
        return;
      }
      if (/^https?:\/\//.test(href)) {
        node.properties!.target = '_blank';
        node.properties!.rel = ['noopener', 'noreferrer'];
      }
    });
  };
}

function mdText(tree: MdRoot): { title: string | null; description: string } {
  let title: string | null = null;
  let description = '';
  visit(tree, (node) => {
    if (!title && node.type === 'heading' && node.depth === 1) {
      title = toString(node);
    } else if (!description && title && node.type === 'paragraph') {
      description = toString(node).slice(0, 220);
    }
  });
  return { title, description };
}

function toString(node: unknown): string {
  const n = node as { value?: string; children?: unknown[] };
  if (typeof n.value === 'string') return n.value;
  if (Array.isArray(n.children)) return n.children.map(toString).join('');
  return '';
}

/** Split into sections at h2/h3 for search; also collect the TOC. */
function sectionsOf(tree: MdRoot, slug: string, title: string): { toc: TocItem[]; sections: Section[] } {
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];
  const sections: Section[] = [];
  let cur: Section = { id: `${slug}#`, page: slug, heading: title, anchor: '', text: '' };
  for (const node of tree.children) {
    if (node.type === 'heading') {
      const text = toString(node);
      const id = slugger.slug(text);
      if (node.depth === 1) continue;
      if (node.depth <= 3) toc.push({ depth: node.depth, id, text });
      if (cur.text.trim() || cur.anchor === '') sections.push(cur);
      cur = { id: `${slug}#${id}`, page: slug, heading: text, anchor: id, text: '' };
    } else {
      cur.text += ' ' + toString(node);
    }
  }
  sections.push(cur);
  return { toc, sections: sections.map((s) => ({ ...s, text: s.text.replace(/\s+/g, ' ').trim().slice(0, 4000) })) };
}

async function build() {
  mkdirSync(OUT_CONTENT, { recursive: true });
  mkdirSync(join(WEB, 'src/generated'), { recursive: true });

  const inputs: Array<{ file: string; slug: string; group: string; source: string }> = [];
  for (const n of NATIVE) {
    const f = join(CONTENT_DIR, n.file);
    if (existsSync(f)) inputs.push({ file: f, slug: n.slug, group: n.group, source: `web/content/${n.file}` });
  }
  if (existsSync(DOCS_DIR)) {
    const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md') && !EXCLUDE.some((re) => re.test(f)));
    files.sort((a, b) => {
      const ia = ORDER.indexOf(a.replace(/\.md$/, ''));
      const ib = ORDER.indexOf(b.replace(/\.md$/, ''));
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    for (const f of files) {
      const base = f.replace(/\.md$/, '');
      inputs.push({ file: join(DOCS_DIR, f), slug: slugify(f), group: GROUPS[base] ?? 'Reference', source: `docs/${f}` });
    }
  } else {
    console.warn(`build-docs: ${DOCS_DIR} not found — emitting web-native pages only`);
  }

  const known = new Set(inputs.map((i) => i.slug));
  const pages: PageMeta[] = [];
  const allSections: Section[] = [];

  for (const input of inputs) {
    const md = readFileSync(input.file, 'utf8');
    const parser = unified().use(remarkParse).use(remarkGfm);
    const mdTree = parser.parse(md) as MdRoot;
    const { title: t, description } = mdText(mdTree);
    const title = t ?? basename(input.file).replace(/\.md$/, '').replace(/_/g, ' ');
    const { toc, sections } = sectionsOf(mdTree, input.slug, title);
    const html = String(
      await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeSlug)
        .use(rehypeAutolink, { behavior: 'append', properties: { className: ['anchor'], ariaHidden: 'true', tabIndex: -1 }, content: { type: 'text', value: '#' } } as Parameters<typeof rehypeAutolink>[0])
        .use(rehypeDocLinks(known))
        .use(rehypeStringify)
        .process(md),
    );
    const git = gitInfo(input.file);
    const words = md.split(/\s+/).length;
    pages.push({ slug: input.slug, title, group: input.group, source: input.source, commit: git.commit, modified: git.modified, words, description });
    allSections.push(...sections);
    writeFileSync(join(OUT_CONTENT, `${input.slug}.json`), JSON.stringify({ slug: input.slug, title, html, toc, source: input.source, commit: git.commit, modified: git.modified }));
  }

  writeFileSync(OUT_INDEX, JSON.stringify({ generated: new Date().toISOString(), pages, sections: allSections }));
  console.log(`docs: ${pages.length} pages, ${allSections.length} sections → ${OUT_CONTENT}`);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
