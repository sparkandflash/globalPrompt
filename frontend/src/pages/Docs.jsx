import React from 'react';
import { PROJECT_NAME } from '../config';

const Docs = () => {
    return (
        <div className="w-full max-w-3xl mx-auto py-10 px-6 prose prose-neutral dark:prose-invert">
            <h1 className="text-4xl font-extrabold tracking-tight mb-8">Documentation</h1>
            
            <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">Welcome to {PROJECT_NAME}</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    {PROJECT_NAME} is a platform for creating, sharing, and discovering AI prompts and character registries. 
                    This guide will walk you through the core concepts.
                </p>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">Registries</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    A <strong>Registry</strong> is a collection or category where specific types of prompts are grouped. 
                    Think of it as a forum board or a subreddit tailored exactly to a niche, like "Fantasy Roleplay" or "Coding Helpers".
                </p>
                <div className="bg-card border rounded-lg p-5 mt-4">
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                        <li>Anyone can create a registry.</li>
                        <li>You can follow a registry to see its prompts in your feed.</li>
                        <li>Registries have specific themes and descriptions.</li>
                    </ul>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">Prompts (Threads)</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    A <strong>Prompt</strong> is an individual post within a Registry. It contains the primary instructions you would feed 
                    to an AI (like ChatGPT, Claude, or local LLMs) to generate a specific output or roleplay scenario.
                </p>
                <div className="bg-card border rounded-lg p-5 mt-4">
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                        <li>Each prompt belongs to exactly one registry.</li>
                        <li>Prompts can include variables for users to fill in.</li>
                        <li>Other users can comment on prompts to share their generations or suggest improvements.</li>
                    </ul>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
                <ol className="list-decimal pl-5 text-muted-foreground space-y-2">
                    <li>Create an account or login.</li>
                    <li>Browse existing registries through the search bar.</li>
                    <li>Follow registries that interest you.</li>
                    <li>Start creating your own prompts inside relevant registries!</li>
                </ol>
            </section>
        </div>
    );
};

export default Docs;
