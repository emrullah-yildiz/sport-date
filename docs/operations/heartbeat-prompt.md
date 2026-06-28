# Product studio heartbeat

Use this prompt for a thread automation attached to the main Sport Date development thread:

```text
Use $run-product-studio in the sport-date repository. Read the durable agent state and roadmap, inspect the repository and recent work, then choose the highest-value unblocked outcome. Implement one coherent vertical slice, verify it proportionally, update durable state and decisions, and commit only when checks pass. Continue independent work instead of asking routine questions. Do not create accounts, accept external terms, spend money, publish or message externally, deploy production, handle identity documents, or make final legal representations. If every meaningful workstream is blocked by an owner-only action, report one concise escalation containing the decision needed, your recommendation, alternatives, consequence of delay, and exact owner action. Otherwise report only material progress or risk.
```

Recommended configuration:

- Type: thread automation, to retain product context.
- Cadence: every 15 minutes during active build periods; reduce to hourly when monitoring external state.
- Execution: repository worktree for isolation unless the current main checkout is dedicated to the agent.
- Sandbox: workspace-write with narrowly approved network commands; avoid unattended full access.
- Stop condition: all meaningful in-scope work is unsafe or impossible without an owner-only action.

The local machine must remain powered on with the Codex app running for project-scoped automation. Review the first several runs before trusting the cadence.

