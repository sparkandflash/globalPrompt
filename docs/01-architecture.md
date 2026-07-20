# System Architecture

The MSRPEngine is a modular, event-driven system built around a central `AppCore` that merges interactive user communication, background event scheduling, and semantic memory storage into a cohesive digital brain.

## The AppCore 
At the heart of the engine is `AppCore`. This structure holds the primary dependencies and maintains the single source of truth for the active session.

- **Unified Input Queue (`InputQueue`)**: All inputs, whether they originate from the Terminal (CLI Readline) or the REST API (`api/server.go`), are funneled into a single buffered channel. This ensures that the engine processes messages linearly without race conditions, safely buffering while the responder is generating text.
- **State Mutex (`StateMu`)**: Protects the current Biological MindState across multiple concurrent readers (like the API polling endpoints) and writers (like the Reactor Agent).

## Multi-Agent Architecture
The engine orchestrates three specialized LLM agents to simulate an autonomous persona:

1. **Responder Agent**: The primary conversational interface. It holds no long-term state on its own; instead, it is fed a context-rich prompt constructed from Short-Term Memory, biological indicators, and injected Episodic memories.
2. **Reactor Agent**: A lightweight, background-only agent that parses every conversational turn (from both the user and the system) to calculate changes to the system's Biological MindState (Attention, Serotonin, Oxytocin, Cortisol).
3. **Summariser Agent**: Triggered asynchronously during sleep cycles or memory consolidation events. It reviews raw conversation history logs and compresses them into high-level "factual episodes" and "behavioral reflections."

## The Escalator Subsystem
The engine isn't strictly reactive; it's proactive. The **Escalator** is a deterministic rule engine that ticks every second in the background.

- It monitors system metrics like "Time Since Last Message" and "Current Mental Energy."
- It uses a dynamic expression evaluator (`expr`) mapped against a YAML configuration (`default_ruleengine.yaml`) to trigger state changes.
- For example, if the user walks away from the interface, the Escalator will automatically transition the system through varying stages of "Sleep" (from Idle to full Hibernation), emitting system cues that the Responder Agent can react to organically.

## The Data Lifecycle
1. **Perception**: Input arrives via API or CLI. The Responder handles the raw text.
2. **Reaction**: The Reactor evaluates the text to adjust internal emotions.
3. **Storage**: The exact transcript is written to a JSON history file.
4. **Consolidation**: During sleep, the Summariser compresses the JSON into vector-embedded Episodes.
5. **Retrieval**: When the user returns, the Reflector searches the Episode database to surface relevant past contexts for the Responder to use.
