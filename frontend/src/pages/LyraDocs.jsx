import React from 'react';

const LyraDocs = () => {
    return (
        <div className="w-full max-w-3xl mx-auto py-10 px-6 prose prose-neutral dark:prose-invert">
            <h1 className="text-4xl font-extrabold tracking-tight mb-8">Lyra Terminal Documentation</h1>
            
            <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">Welcome to Lyra</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    Lyra is an advanced AI terminal agent. This documentation will help you understand how to interact with Lyra and interpret its MindState outputs.
                </p>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">Interacting with Lyra</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    You can type commands and messages directly into the terminal. Lyra will process your input and respond based on its current state and personality constraints.
                </p>
                <div className="bg-card border rounded-lg p-5 mt-4">
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                        <li>Type your message and press Enter to send.</li>
                        <li>Use up/down arrows to navigate command history.</li>
                        <li>System failure glitches may occasionally occur based on Lyra's internal state.</li>
                    </ul>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">MindState Metrics (Hormones)</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                    Lyra's responses are influenced by its internal MindState, which consists of five distinct metrics:
                </p>
                <div className="bg-card border rounded-lg p-5 mt-4">
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                        <li><strong>MA (Maintenance):</strong> Represents the agent's focus on self-preservation and system stability.</li>
                        <li><strong>UA (Utilization):</strong> Indicates the agent's current processing load and task engagement.</li>
                        <li><strong>SE (Serotonin):</strong> Reflects the agent's general well-being and satisfaction.</li>
                        <li><strong>OX (Oxytocin):</strong> Measures the agent's affinity and trust towards the user.</li>
                        <li><strong>CO (Cortisol):</strong> Represents the agent's stress level and urgency.</li>
                    </ul>
                </div>
            </section>
        </div>
    );
};

export default LyraDocs;
