import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bold, Italic, List, Heading2, Save, Lock, Download, ArrowLeft, Sparkles } from 'lucide-react';
import api from '../../lib/api';

export default function MomEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3] }),
      Placeholder.configure({ placeholder: 'AI-generated gist will appear here. Edit as needed...' }),
    ],
    content: app?.momText || app?.gistText || '',
    editable: !app?.momLocked,
    onUpdate: ({ editor: e }) => {
      void autoSave(e.getHTML());
    },
  });

  // Update editor content when app data loads
  if (editor && app && !editor.getText()) {
    editor.commands.setContent(app.momText || app.gistText || '');
  }

  let saveTimeout: ReturnType<typeof setTimeout>;
  const autoSave = async (content: string) => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await api.patch(`/gist/${id}`, { momText: content });
      } catch { /* silent */ }
      setIsSaving(false);
    }, 2000);
  };

  const lockMutation = useMutation({
    mutationFn: () => api.post(`/gist/${id}/lock`),
    onSuccess: () => {
      toast.success('MoM finalized and locked!');
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: () => toast.error('Failed to lock MoM'),
  });

  const toolbarBtn = (onClick: () => void, icon: React.ReactNode, title: string, active?: boolean) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors text-sm ${active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      {icon}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">MoM Editor</h1>
            <p className="text-sm text-gray-500 truncate max-w-md">{app?.projectName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-gray-400">Saving...</span>}
          {app?.gistText && !app?.momText && (
            <button
              onClick={() => editor?.commands.setContent(app.gistText || '')}
              className="flex items-center gap-1.5 text-sm text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100"
            >
              <Sparkles className="w-3.5 h-3.5" /> Load AI Gist
            </button>
          )}
          <a
            href={`/api/gist/${id}/export?format=pdf`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </a>
          {!app?.momLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (confirm('Finalize and lock this MoM? This cannot be undone.')) {
                  lockMutation.mutate();
                }
              }}
              disabled={lockMutation.isPending}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium"
            >
              <Lock className="w-3.5 h-3.5" /> Finalize MoM
            </motion.button>
          )}
        </div>
      </div>

      {/* Locked banner */}
      {app?.momLocked && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
          <Lock className="w-4 h-4" />
          This MoM is finalized and locked. No further edits are permitted.
          <a href={`/api/gist/${id}/export?format=pdf`} target="_blank" rel="noreferrer" className="ml-auto font-medium underline underline-offset-2">
            Download PDF
          </a>
        </div>
      )}

      {/* TipTap editor */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        {!app?.momLocked && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
            {toolbarBtn(() => editor?.chain().focus().toggleBold().run(), <Bold className="w-4 h-4" />, 'Bold', editor?.isActive('bold'))}
            {toolbarBtn(() => editor?.chain().focus().toggleItalic().run(), <Italic className="w-4 h-4" />, 'Italic', editor?.isActive('italic'))}
            {toolbarBtn(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="w-4 h-4" />, 'Heading', editor?.isActive('heading', { level: 2 }))}
            {toolbarBtn(() => editor?.chain().focus().toggleBulletList().run(), <List className="w-4 h-4" />, 'Bullet List', editor?.isActive('bulletList'))}
            <div className="flex-1" />
            <span className="text-xs text-gray-400">Auto-saved</span>
          </div>
        )}

        {/* Editor content */}
        <div className="min-h-[500px] px-10 py-8">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none"
          />
        </div>
      </div>

      {/* AI Gist */}
      {app?.gistText && (
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-purple-800 text-sm">AI-Generated Gist (for reference)</h3>
          </div>
          <div className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-6">{app.gistText}</div>
        </div>
      )}
    </div>
  );
}
