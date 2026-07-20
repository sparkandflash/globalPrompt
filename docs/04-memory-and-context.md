# Memory and Context

The MSRPEngine operates entirely on local flat-files for transparency and portability. There are no heavy background SQL servers to maintain. When you spin up an MSRPEngine binary, it will spawn a local `Context/` folder directly adjacent to the executable.

## Folder Structure

```
Context/
├── conversationHistory/
│   ├── sessions.csv
│   └── 20260720-100154.json
└── semantic_memory/
    ├── episodes/
    │   └── facts.json
    └── index.jsonl
```

## 1. Short-Term Memory (STM)
STM isn't saved permanently to disk as its own database; it is actively maintained in RAM by the `STMmanager` during a session.
- Both the Responder and the Reactor have independent STMs.
- The STM acts as a sliding window (e.g., retaining the last 2000 characters of conversation) to provide immediate context without overflowing the LLM context window.

## 2. Long-Term Conversation History (JSON)
Every message (from the User, the Assistant, or the System) is fully logged to a daily-rotated JSON file inside `Context/conversationHistory/`.
- This ensures absolute accountability and prevents any text from being lost.
- If a session crashes, the engine rebuilds the STM array from the most recent JSON file upon reboot.

## 3. Session Ledger (CSV)
`sessions.csv` is a lightweight ledger that tracks the exact biological MindState and Mental Energy at the moment a session closes (either via a safe exit, a crash, or deep hibernation). This guarantees the persona perfectly resumes its emotional state the next time you boot it.

## 4. Episodic Long-Term Memory
Raw conversation logs are too long to feed into prompts forever. Instead, the MSRPEngine relies on the **Summariser Agent** and **Reflector Module**.

1. **Consolidation**: During sleep, the Summariser agent reads the recent raw JSON history. It extracts critical new information and compresses it into a high-level "Episode" fact.
2. **Storage**: This fact is saved to `Context/semantic_memory/`. If local embedding is enabled, it is also embedded into a vector space using a local Ollama sidecar.
3. **Retrieval**: During active chat or Reflection cycles, the Reflector searches the episodic database. If it finds relevant facts, it loads them into the active Episode Pool, which is injected directly into the LLM system prompt. This allows the bot to "remember" long-term facts seamlessly.
