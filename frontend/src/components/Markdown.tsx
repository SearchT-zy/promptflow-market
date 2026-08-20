import { useMemo } from 'react';
import { renderMarkdown } from '../lib/md';

export function Markdown({ md, className = '' }: { md: string | null | undefined; className?: string }) {
  const html = useMemo(() => renderMarkdown(md), [md]);
  return <div className={`md-body ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
