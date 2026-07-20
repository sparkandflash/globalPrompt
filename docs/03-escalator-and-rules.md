# The Escalator Rule Engine

MSRPEngine is governed by a background tick system called the **Escalator**. Rather than using an LLM to decide when to perform background tasks (like memory consolidation or going to sleep), the Escalator uses a deterministic YAML rule set. This saves massive amounts of tokens and ensures reliable, predictable lifecycle behavior.

## How it Works
The Escalator ticks every few seconds. On each tick, it builds an `Env` struct containing all relevant system metrics, such as:
- `IdleDurationMins`: How long it's been since the user sent a message.
- `TimeSinceConsolidationMins`: How long since the memory pool was last compacted.
- `CurrentSleepMode`: The current arousal state (0 = Awake, 1 = TempSleep, 2 = TrueSleep).
- Biological variables (MA, UA, SE, OX, CO).
- The current Mental Energy battery.

It evaluates these metrics against `default_ruleengine.yaml` using the `antonmedv/expr` package. The highest priority rule that returns `true` emits an Event.

## YAML Configuration
Rules are evaluated deterministically. Example from `default_ruleengine.yaml`:

```yaml
  - name: "EnterTempSleep"
    condition: "IdleDurationMins >= SYSTEM_TEMP_SLEEP_DELAY_MINS && CurrentSleepMode != 1 && CurrentSleepMode != 2"
    action: "ENTER_TEMP_SLEEP"
    priority: 10

  - name: "ConsolidateMemories"
    condition: "HasUnconsolidatedMessages && TimeSinceConsolidationMins >= SYSTEM_CONSOLIDATION_FREQ_MINS"
    action: "CONSOLIDATE"
    priority: 8
```

## Sleep Modes
The system tracks the user's presence through Sleep Modes.

- **Awake (0)**: The user is actively typing. 
- **Temp Sleep (1)**: If `IdleDurationMins` surpasses the `SYSTEM_TEMP_SLEEP_DELAY_MINS` threshold (e.g., 5 minutes), the agent enters Temp Sleep. A system message (`[System: User has disconnected from the interface.]`) is injected into the context stream. This informs the agent that the user walked away, preventing it from hallucinating or behaving as if the conversation is continuing seamlessly.
- **Hibernation (2)**: If hours pass (`SYSTEM_TRUE_SLEEP_DELAY_MINS`), the system goes into deep Hibernation. Background tasks are paused, and a final hibernation log is recorded.

When the user returns (sends a new message), the system immediately snaps back to Awake (0), injecting a `[System: you just woke up...]` message with the current real-world timestamp so the agent understands how much time passed.
