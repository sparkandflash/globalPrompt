import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Use Vite's glob import to read all markdown files from the docs directory
const mdFiles = import.meta.glob('../../docs/*.md', { eager: true, query: '?raw', import: 'default' });

const LyraDocs = () => {
    // Process the loaded files into a list
    const docsList = Object.keys(mdFiles).map((path) => {
        const filename = path.split('/').pop();
        // Create a readable title (e.g. "01-architecture.md" -> "Architecture")
        const title = filename.replace('.md', '').replace(/^\d+-/, '').replace(/-/g, ' ');
        return {
            path,
            filename,
            title: title.charAt(0).toUpperCase() + title.slice(1),
            content: mdFiles[path],
        };
    }).sort((a, b) => a.filename.localeCompare(b.filename));

    const [activeDoc, setActiveDoc] = useState(docsList[0] || null);

    return (
        <div className="w-full max-w-[1200px] mx-auto py-10 px-6 flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0 md:pr-6">
                <h2 className="text-2xl font-extrabold mb-6 tracking-tight">Lyra Docs</h2>
                <nav className="flex flex-col space-y-1">
                    {docsList.map((doc) => (
                        <button
                            key={doc.path}
                            onClick={() => setActiveDoc(doc)}
                            className={`text-left px-3 py-2 rounded-md transition-colors text-sm ${
                                activeDoc?.path === doc.path 
                                    ? 'bg-primary text-primary-foreground font-medium' 
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {doc.title}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-x-auto">
                {activeDoc ? (
                    <div className="prose prose-neutral dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {activeDoc.content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="text-muted-foreground">
                        No documentation files found in the docs/ folder.
                    </div>
                )}
            </div>
        </div>
    );
};

export default LyraDocs;
