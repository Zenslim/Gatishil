'use client';

import type { ReactNode } from 'react';

function renderNode(node: any, key: number | string): ReactNode {
  if (!node) return null;
  if (typeof node.text === 'string') {
    return node.text;
  }
  if (Array.isArray(node.children)) {
    const children = node.children.map((child: any, index: number) => renderNode(child, index));
    const name = node.name ?? node.type;
    switch (name) {
      case 'p':
      case 'paragraph':
        return (
          <p key={key}>
            {children}
          </p>
        );
      case 'strong':
        return (
          <strong key={key}>
            {children}
          </strong>
        );
      case 'em':
        return (
          <em key={key}>
            {children}
          </em>
        );
      case 'ul':
        return <ul key={key}>{children}</ul>;
      case 'ol':
        return <ol key={key}>{children}</ol>;
      case 'li':
        return <li key={key}>{children}</li>;
      default:
        return <div key={key}>{children}</div>;
    }
  }
  return null;
}

export function TinaMarkdown({ content }: { content?: any }) {
  if (!content) return null;
  const nodes = Array.isArray(content.children) ? content.children : Array.isArray(content) ? content : [content];
  return <>{nodes.map((node, index) => renderNode(node, index))}</>;
}
