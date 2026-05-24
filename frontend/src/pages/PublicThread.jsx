import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { toast } from 'sonner';
import { PROJECT_NAME } from '../config';

const PublicThread = () => {
    const { id } = useParams();
    const [thread, setThread] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const isLoggedIn = !!localStorage.getItem('auth_token');
    const currentUsername = localStorage.getItem('username');

    useEffect(() => {
        const fetchThread = async () => {
            try {
                const res = await api.get(`/p/${id}`);
                setThread(res.data);

                // Inject OG meta tags dynamically
                const t = res.data;
                const title = t.prompt?.title ? `${t.prompt.title} — ${PROJECT_NAME}` : PROJECT_NAME;
                const description = t.prompt?.content
                    ? t.prompt.content.slice(0, 160).replace(/\n/g, ' ')
                    : `View this prompt on ${PROJECT_NAME}`;
                const url = window.location.href;

                document.title = title;
                setOrCreate('og:title', title);
                setOrCreate('og:description', description);
                setOrCreate('og:url', url);
                setOrCreate('og:type', 'article');
                setOrCreate('twitter:card', 'summary');
                setOrCreate('twitter:title', title);
                setOrCreate('twitter:description', description);
            } catch (err) {
                setError('Thread not found or unavailable.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchThread();
    }, [id]);

    const setOrCreate = (property, content) => {
        const isOg = property.startsWith('og:');
        const attr = isOg ? 'property' : 'name';
        let el = document.querySelector(`meta[${attr}="${property}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, property);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/og/${id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/threads/${id}/comments/${commentId}`);
            setThread(prev => ({
                ...prev,
                comments: (prev.comments || []).filter(comment => comment.id !== commentId),
            }));
            toast.success('Comment deleted');
        } catch (err) {
            console.error("Failed to delete comment", err);
            toast.error(err.response?.data || 'Failed to delete comment');
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto py-12 space-y-4 animate-pulse">
                <div className="h-6 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-40 bg-muted rounded w-full mt-6" />
            </div>
        );
    }

    if (error || !thread) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                <p>{error || 'Thread not found.'}</p>
                <Link to="/" className="text-primary hover:underline mt-4 inline-block">Go to home</Link>
            </div>
        );
    }

    const charCount = thread.prompt?.content?.length || 0;
    const tokenEstimate = Math.ceil(charCount / 4);
    const comments = thread.comments || [];

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link to="/" className="hover:underline">Home</Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">{thread.prompt?.title}</span>
                </div>
                <h1 className="text-2xl font-bold">{thread.prompt?.title}</h1>
                <p className="text-sm text-muted-foreground">
                    by <span className="text-foreground font-medium">{thread.userName}</span>
                    {thread.prompt?.registry?.name && (
                        <> in <span className="text-foreground font-medium">{thread.prompt.registry.name}</span></>
                    )}
                </p>
            </div>

            {/* Prompt Content */}
            <div className="border border-border/50 rounded-xl p-6 bg-card shadow-sm">
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {thread.prompt?.content || <span className="text-muted-foreground italic">No content provided</span>}
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 text-neutral-500 text-sm pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <span>Total Replies <span className="text-foreground font-medium">{comments.length}</span></span>
                <span>•</span>
                <span><span className="text-foreground font-medium">{charCount}</span> chars</span>
                <span>•</span>
                <span>~<span className="text-foreground font-medium">{tokenEstimate}</span> tokens</span>
                <span>•</span>
                <button onClick={handleShare} className="text-primary hover:underline">Share</button>
                {!isLoggedIn && (
                    <>
                        <span>•</span>
                        <Link to="/login" className="text-primary hover:underline">Sign in to comment</Link>
                    </>
                )}
            </div>

            {/* Comments: read-only for guests */}
            <div className="pt-2 space-y-1">
                {comments.length === 0 && (
                    <p className="text-sm text-neutral-500 italic text-center py-4">No comments yet.</p>
                )}
                {comments.map((comment, index) => (
                    <div key={comment.id}>
                        {index > 0 && <hr className="border-neutral-300 dark:border-neutral-600" />}
                        <div className="py-3 px-2">
                            <p className="text-sm font-medium mb-1">
                                {comment.userName || comment.user?.username || 'Anonymous'}
                            </p>
                            <p className="text-sm text-foreground/80">{comment.content}</p>
                            {isLoggedIn && comment.user?.username === currentUsername && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="mt-2 text-xs text-destructive hover:underline"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PublicThread;
