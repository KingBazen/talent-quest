# User stories

Format: `As <role>, I want <capability>, so that <benefit>.` Each story has
acceptance hints to keep them testable.

## Visitor

- **V-1** As a visitor, I want to land on a homepage that explains the
  competition in 30 seconds, so I decide to register or watch.
  - Hero, stats, four-step explainer, category grid, showcase teaser, and CTA
    are visible above the fold or one scroll on mobile.
- **V-2** As a visitor, I want to browse showcase clips by category and
  switch between Reels and grid layouts, so I find content my way.
- **V-3** As a visitor, I want a chatbot in English or Amharic, so I can ask
  basic questions before deciding to register.
- **V-4** As a visitor, I want to view the judging rubric and event schedule,
  so I understand what I'm signing up for.

## Contestant

- **C-1** As a contestant, I want to register in under 60 seconds with three
  short steps, so I don't abandon the form.
- **C-2** As a contestant, I want to receive a unique 6-digit ID immediately,
  so I can find my profile and result later.
- **C-3** As a contestant, I want to upload a video up to 500 MB with a
  visible progress bar and resumable chunks, so a flaky network doesn't
  destroy my submission.
- **C-4** As a contestant, I want to see my profile (status, scores, schedule,
  notes from judges), so I know exactly where I stand.
- **C-5** As a contestant, I want to look up my result with my ID without
  logging in, so my parents or friends can check it for me.
- **C-6** As a contestant, I want to pay the entry fee via Telebirr through
  AdmasPay/Paylib, so I don't need a credit card.
- **C-7** As a contestant, I want SMS + email confirmation after registration,
  payment, submission, and result, so I never miss a milestone.
- **C-8** As a contestant, I want the Amharic interface to be available
  end-to-end (forms, errors, notifications, chatbot), so language is never a
  barrier.

## Referee / Judge

- **R-1** As a judge, I want to see only the clips assigned to me, so I'm not
  flooded.
- **R-2** As a judge, I want to score on the same five-criterion rubric every
  round, so my judgments are consistent.
- **R-3** As a judge, I want to leave private notes that other judges can see
  but contestants cannot, so we calibrate.
- **R-4** As a judge, I want to flag a clip (audio fail, copyright, ineligible
  content), so admins handle exceptions.
- **R-5** As a judge, I want to resume scoring on another device exactly where
  I left off, so I'm not chained to one machine.

## Admin

- **A-1** As an admin, I want a single dashboard showing registrations,
  payments, submissions, and review queue, so I run the season at a glance.
- **A-2** As an admin, I want to open / close rounds and reassign judges, so
  I can adjust to volume.
- **A-3** As an admin, I want a full audit trail of score changes, payment
  status, and content moderation actions, so disputes are resolvable.
- **A-4** As an admin, I want to publish results to contestant profiles and
  the public Result Checker with a single action per round, so I avoid
  inconsistent state.
- **A-5** As an admin, I want bulk SMS + email notifications via templated
  messages, so contestants get timely updates.
- **A-6** As an admin, I want refund / payment-correction tooling, so I can
  resolve mispayments without a developer.

## Cross-cutting

- **X-1** As any user, I want the site to work on a 3G connection on a low-
  end Android, so I'm not excluded by hardware.
- **X-2** As any user, I want the site to remain functional with JavaScript
  partially blocked, so the core flow degrades gracefully.
