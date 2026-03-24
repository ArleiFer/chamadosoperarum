import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, 
  Link as LinkIcon, Image as ImageIcon, Type,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize content once
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url) executeCommand('createLink', url);
  };

  const addImage = () => {
    const url = window.prompt('URL da imagem:');
    if (url) executeCommand('insertImage', url);
  };

  const setTextColor = () => {
    // Operarum Green
    executeCommand('foreColor', '#00311c');
  };

  return (
    <div className={cn(
      "rounded-sm border border-slate-300 overflow-hidden bg-white flex flex-col transition-all",
      isFocused && "ring-2 ring-operarum border-operarum shadow-lg shadow-operarum/10"
    )}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Sublinhado"
        >
          <Underline className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Lista de marcadores"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('justifyLeft')}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Alinhar à esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyCenter')}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyRight')}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Alinhar à direita"
        >
          <AlignRight className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={addLink}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Inserir link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded hover:bg-slate-200 text-slate-600 transition-colors"
          title="Inserir imagem"
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={setTextColor}
          className="p-2 rounded-sm hover:bg-slate-200 text-slate-600 transition-colors"
          title="Cor de destaque (Operarum)"
        >
          <Type className="h-4 w-4 text-operarum" />
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 p-4 min-h-[200px] focus:outline-none prose prose-slate max-w-none text-slate-700 font-sans custom-editor"
        data-placeholder={placeholder}
      />

      <style>{`
        .custom-editor:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        .custom-editor ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .custom-editor ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .custom-editor a { color: #00311c; text-decoration: underline; font-weight: bold; }
        .custom-editor img { max-width: 100%; height: auto; border-radius: 0.125rem; margin: 0.5rem 0; }
        .custom-editor blockquote { border-left: 4px solid #00311c; padding-left: 1rem; color: #64748b; font-style: italic; }
      `}</style>
    </div>
  );
}
