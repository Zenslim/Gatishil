'use client';

import { useCallback, useEffect } from 'react';
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export type RichTextProps = {
  value: string;
  onChange: (html: string) => void;
};

export default function RichText({ value, onChange }: RichTextProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'text-amber-300 underline decoration-dotted underline-offset-4 hover:text-amber-200',
        },
      }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[240px] bg-black/60 p-4 text-base leading-relaxed text-slate-100 focus:outline-none',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '<p></p>', false);
    }
  }, [editor, value]);

  const exec = useCallback(
    (command: () => boolean) => {
      if (!editor) return;
      command();
    },
    [editor],
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', previous ?? '');
    if (url === null) {
      return;
    }
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    try {
      const sanitized = new URL(url, window.location.origin).toString();
      editor.chain().focus().extendMarkRange('link').setLink({ href: sanitized }).run();
    } catch {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-white/60">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/50 p-2 text-sm text-white/80">
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => exec(() => editor.chain().focus().toggleBold().run())}
        />
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => exec(() => editor.chain().focus().toggleItalic().run())}
        />
        <ToolbarButton
          label="H1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => exec(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        />
        <ToolbarButton
          label="H2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => exec(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        />
        <ToolbarButton
          label="•"
          active={editor.isActive('bulletList')}
          onClick={() => exec(() => editor.chain().focus().toggleBulletList().run())}
        />
        <ToolbarButton
          label="1."
          active={editor.isActive('orderedList')}
          onClick={() => exec(() => editor.chain().focus().toggleOrderedList().run())}
        />
        <ToolbarButton label="Undo" onClick={() => exec(() => editor.chain().focus().undo().run())} />
        <ToolbarButton label="Redo" onClick={() => exec(() => editor.chain().focus().redo().run())} />
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink} />
        <ToolbarButton
          label="Clear"
          onClick={() => exec(() => editor.chain().focus().clearNodes().unsetAllMarks().run())}
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
};

function ToolbarButton({ label, active = false, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 font-semibold transition ${
        active ? 'bg-amber-400 text-slate-900 shadow' : 'bg-white/5 text-white/80 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}
