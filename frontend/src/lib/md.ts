// Markdown 渲染：marked 解析 + dompurify 消毒
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function renderMarkdown(md: string | null | undefined): string {
  const src = md == null ? '' : String(md);
  const html = marked.parse(src, { async: false }) as string;
  return DOMPurify.sanitize(html);
}

export function markdownToText(md: string | null | undefined): string {
  const html = renderMarkdown(md);
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || '').trim();
}
