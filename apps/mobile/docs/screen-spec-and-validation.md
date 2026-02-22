# Screen Spec And Validation Criteria

## Screen sections

### Home
- Header and context timestamp.
- Today brief summary.
- Outstanding list.
- Blocker strip.
- Quick actions (run pipeline, assistant, connect integrations).

### Workflows
- Existing workflows list with schedule/providers/channels.
- Run now action.
- Template onboarding cards if no workflows.

### Assistant
- Suggested question.
- Grounded response area with context references.
- Empty card with response generation CTA.

### History
- Run timeline cards with status and delivery channels.
- Drill-down details section for selected run.
- Empty card when no runs exist.

### Settings
- Integration cards with states:
  - Connected
  - Disconnected
  - Error (token expired)
  - Syncing/delayed
- Scope/consent controls with revoke/enable toggle.
- Notification defaults and sign-out action.

## Code map
- Navigation shell: `apps/mobile/src/navigation/AppShell.tsx`
- Tab IA: `apps/mobile/src/navigation/tabIA.ts`
- Data orchestration: `apps/mobile/src/state/AppState.tsx`
- API bridge: `apps/mobile/src/services/apiClient.ts`
- Tab screens: `apps/mobile/src/screens/tabs/*.tsx`
- Empty/onboarding components:
  - `apps/mobile/src/components/EmptyStateCard.tsx`
  - `apps/mobile/src/components/OnboardingWizard.tsx`

## Acceptance criteria
- User can finish onboarding without connecting any provider.
- User can run first pipeline from onboarding and from Home empty state.
- Every tab has a deterministic empty-state with at least one forward CTA.
- Integration cards clearly communicate status, sync recency, and next action.
- History details can be opened from run cards.
- Mobile typecheck passes and no new lint errors are introduced in modified files.
