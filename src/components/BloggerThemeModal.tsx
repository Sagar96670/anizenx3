import React, { useState } from 'react';
import { X, Copy, Download, Check, FileCode, Sparkles } from 'lucide-react';
import { generateBloggerXML } from '../utils/bloggerTemplate';

interface BloggerThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BloggerThemeModal: React.FC<BloggerThemeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const xmlContent = generateBloggerXML();

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anime-api-blogger-theme.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121222] border border-purple-500/40 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl shadow-purple-950/80 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-900/40 bg-[#16162b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/40">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Google Blogger XML Theme <Sparkles className="w-4 h-4 text-purple-400" />
              </h2>
              <p className="text-xs text-purple-300">Ready-to-import Blogger XML template for KUROIWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-purple-950/40 text-gray-400 hover:text-white border border-purple-900/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: XML Code preview */}
        <div className="p-6 overflow-y-auto flex-grow bg-[#0b0b14] font-mono text-xs text-purple-200">
          <p className="text-gray-400 mb-4 font-sans text-sm">
            This is the complete, valid Google Blogger XML theme template. You can copy it or download the <code className="text-purple-400">.xml</code> file and upload it directly into your Google Blogger Dashboard &gt; Theme &gt; Restore &gt; Upload.
          </p>
          <pre className="bg-[#080810] p-4 rounded-2xl border border-purple-900/30 overflow-x-auto max-h-96 text-gray-300 select-all">
            {xmlContent}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-purple-900/40 bg-[#16162b]">
          <span className="text-xs text-gray-400">Compatible with Blogger Layout &amp; Theme Editor</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy XML Code'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/40 transition-all transform hover:scale-105"
            >
              <Download className="w-4 h-4" /> Download .xml File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
