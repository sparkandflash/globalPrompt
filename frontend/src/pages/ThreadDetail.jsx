import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserRegistries } from '../components/dashboard/UserRegistries';
import { RecentThreads } from '../components/dashboard/RecentThreads';
import api from '../api';
import { Button } from "@/components/ui/button"
import { toast } from 'sonner';


export const ThreadDetail = () => {
    const { id } = useParams();
    const [thread, setThread] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [commentText, setCommentText] = useState('');

    const [comments, setComments] = useState([]);

    const currentUsername = localStorage.getItem('username');
    
    useEffect(() => {
        const fetchThreadDetail = async () => {
            setIsLoading(true);
            try {
                const res = await api.get(`/threads/${id}`);
                setThread(res.data);
                setEditContent(res.data.prompt?.content || '');
                setComments(res.data.comments || []);
            } catch (err) {
                console.error("Failed to fetch thread details", err);
                setError(err.response?.data?.message || err.message || "Failed to load thread");
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchThreadDetail();
        }
    }, [id]);


    // Derived state
    const isAuthor = thread?.user?.username === currentUsername;
    const isPromptAuthor = thread?.prompt?.user?.username === currentUsername || isAuthor;

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        
        try {
            const res = await api.post(`/threads/${id}/comments`, { content: commentText });
            const newComment = res.data;
            
            // Add new comment to state
            setComments([...comments, newComment]);
            setCommentText('');
        } catch (err) {
            console.error("Failed to submit comment", err);
        }
    };

    const handleSaveEdit = async () => {
        try {
            await api.put(`/threads/${id}/prompt`, { content: editContent });
            
            // UI update
            setThread(prev => ({
                ...prev,
                prompt: {
                    ...prev.prompt,
                    content: editContent
                }
            }));
            setIsEditing(false);
        } catch (err) {
             console.error("Failed to save thread edit", err);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await api.delete(`/threads/${id}/comments/${commentId}`);
            setComments(prev => prev.filter(comment => comment.id !== commentId));
            toast.success('Comment deleted');
        } catch (err) {
            console.error("Failed to delete comment", err);
            toast.error(err.response?.data || 'Failed to delete comment');
        }
    };


    if (isLoading) {
        return (
            <div className="w-full max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-pulse">
                <aside className="hidden md:block md:col-span-3 sticky top-6">
                     <div className="border rounded-lg p-4 h-[300px] bg-card"></div>
                </aside>
                <main className="md:col-span-6 space-y-6">
                    <div className="border bg-card rounded-lg p-5 flex flex-col gap-4">
                        <div className="h-6 bg-muted rounded w-1/3"></div>
                        <div className="h-4 bg-muted rounded w-1/4"></div>
                        <div className="h-32 bg-muted rounded w-full mt-4"></div>
                    </div>
                </main>
                <aside className="hidden md:block md:col-span-3 sticky top-6">
                     <div className="border rounded-lg p-4 h-[200px] bg-card"></div>
                </aside>
            </div>
        );
    }

    if (error) {
        return <div className="text-center text-red-500 py-10 font-medium">Error: {error}</div>;
    }

    if (!thread) {
         return <div className="text-center text-neutral-500 py-10 font-medium">Thread not found</div>;
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Sidebar: My Registries */}
            <aside className="hidden md:block md:col-span-3 sticky top-6">
                <UserRegistries />
            </aside>

            {/* Center Content: Thread Detail */}
            <main className="md:col-span-6 space-y-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b">
                    <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                    <span>/</span>
                    <span className="font-medium text-foreground truncate">{thread.prompt?.title}</span>
                </div>

                <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{thread.prompt?.title}</h1>
                        <span className="text-muted-foreground">•</span>
                        <Link to={`/registry/${thread.prompt?.registryId}`} className="text-muted-foreground hover:underline">
                            {thread.prompt?.registry?.name}
                        </Link>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        <span className="text-neutral-500">by:</span> 
                        <span className="text-foreground font-medium ml-1">{thread.userName}</span>
                    </p>
                </div>

                {/* Prompt Content Box (View or Edit State) */}
                <div className="border border-border/50 rounded-xl p-6 bg-card shadow-sm">
                    {isEditing ? (
                        <div className="space-y-4">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full min-h-[300px] p-4 bg-background border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-mono"
                                placeholder="Edit your prompt content here..."
                            />
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button onClick={handleSaveEdit}>Save Changes</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed overflow-x-auto">
                                {thread.prompt?.content || <span className="text-muted-foreground italic">No content provided</span>}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between border-t pt-4 gap-4">
                                {/* Comment form */}
                                <form onSubmit={handleCommentSubmit} className="flex flex-1 w-full sm:w-[400px] gap-2">
                                    <input 
                                        type="text" 
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1 px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    />
                                    <Button type="submit" variant="default" className="shrink-0">Comment</Button>
                                </form>
                                
                                {/* Manage Prompt (Author Only) */}
                                {isPromptAuthor && (
                                    <Button variant="secondary" onClick={() => setIsEditing(true)}>
                                        Manage Prompt
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats / Metadata */}
                <div className="flex items-center gap-2 text-neutral-500 text-sm pt-2 pb-4 border-b">
                     <span>Total Replies <span className="text-foreground font-medium">{comments.length}</span></span>
                     <span>•</span>
                     <span><span className="text-foreground font-medium">{thread.prompt?.content?.length || 0}</span> chars</span>
                     <span>•</span>
                     <span>~<span className="text-foreground font-medium">{Math.ceil((thread.prompt?.content?.length || 0) / 4)}</span> tokens</span>
                     <span>•</span>
                     <button
                         className="text-primary hover:underline"
                         onClick={() => {
                             const publicUrl = `${window.location.origin}/og/${id}`;
                             navigator.clipboard.writeText(publicUrl);
                             toast.success('Link copied to clipboard!');
                         }}
                     >
                         Share
                     </button>
                </div>

                {/* Comments Section */}
                 <div className="pt-2">
                     {comments.map((comment, index) => (
                         <div key={comment.id}>
                             {index > 0 && <hr className="border-neutral-300 dark:border-neutral-600" />}
                             <div className="py-3 hover:bg-muted/20 transition-colors px-2 rounded-md">
                                 <p className="text-sm font-medium mb-1">{comment.userName || comment.user?.username || 'Anonymous'}</p>
                                 <p className="text-sm text-foreground/80">{comment.content}</p>
                                 {((isPromptAuthor && isEditing) || comment.user?.username === currentUsername) && (
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
                     
                     {comments.length === 0 && (
                         <p className="text-sm text-neutral-500 italic py-4 text-center">No comments yet. Be the first to start the discussion!</p>
                     )}
                </div>

            </main>

            {/* Right Sidebar: Recent Threads */}
            <aside className="hidden md:block md:col-span-3 sticky top-6">
                <RecentThreads />
            </aside>
        </div>
    );
};

export default ThreadDetail;
