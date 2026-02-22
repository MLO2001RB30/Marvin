# Onboarding And Empty State Matrix

## Skippable onboarding wizard

Wizard entry condition:
- No connected integration (`integration.status === "connected"` count is 0)
- No latest snapshot (`latestContext == null`)
- App state loaded successfully

Wizard steps:
1. Value proposition: capture + reasoning + execution loops.
2. Optional provider connect quick actions.
3. Privacy model explanation (metadata/embeddings boundary).
4. First-run choices:
   - Run in demo mode
   - Run with connected accounts

## Empty-state matrix

### Home
- Condition: `latestContext == null`
- Primary CTA: `Run demo pipeline`
- Secondary CTA: `Connect integrations`
- Message: explain no daily context exists yet.

### Workflows
- Condition: `workflows.length === 0`
- CTA set:
  - Create `daily_digest` template
  - Create `follow_up_summary` template

### Assistant
- Condition: `assistantAnswer == null`
- CTA: `Generate answer`
- Message varies:
  - if no context: ask user to generate first snapshot
  - if context exists: prompt for grounded response generation

### History
- Condition: `workflowRuns.length === 0`
- Message: run workflow/pipeline to populate timeline and traces.

### Settings
- Condition: `integrationAccounts.length === 0`
- CTA set:
  - Connect Gmail
  - Connect Calendar
- Shows fallback so user can proceed without blocking onboarding.
