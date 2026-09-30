# Concourse design system

Concourse is a focused job-search workspace. The interface should feel calm,
compact, and direct. It uses a light product canvas, one deep-green accent, and
the Outfit type family. The structure is informed by Linear's compact product
rhythm, adapted to Concourse rather than copied.

## Product principles

- Show the user's work before marketing language.
- Use the page name as the page heading: Dashboard, Applications, Outreach, or
  Settings.
- Keep actions close to the information they change.
- Use plain language that explains the immediate benefit.
- Prefer spacing and dividers to extra cards, labels, and decoration.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#f1efe8` | Application background |
| Surface | `#fffefa` | Sidebar, forms, and primary panels |
| Text | `#172033` | Headings and primary content |
| Muted text | `#647083` | Supporting copy |
| Accent | `#0f6e56` | Primary actions, focus, and active states |
| Border | `#dfdcd3` | Dividers and panel boundaries |
| Danger | `#b42318` | Errors and destructive actions |

Use an 8px control radius and a 12px panel radius. Avoid shadows unless an
overlay needs elevation.

## Typography

- Page title: 32px desktop, 28px tablet, 26px mobile; weight 600-700.
- Section title: 18px; weight 600.
- Body: 14-16px; weight 400; line height 1.5-1.6.
- Button and navigation labels: 14px; weight 600.
- Helper text: 12px; muted.
- Marketing and onboarding display text must stay at or below 52px desktop and
  48px mobile.

## Application shell

- The Concourse sidebar is fixed on desktop and can collapse to an icon rail.
- The brand stays at the top; the account and sign-out control stay at the
  bottom.
- Only the page content scrolls.
- Below 800px, use a fixed top brand header and fixed bottom navigation.
- Content begins at the left edge of its container and has a maximum width of
  1280px.

## Forms

- Labels sit above inputs.
- Required fields use an asterisk. Do not repeat “Optional” under every other
  field.
- Errors appear beside the affected field and never replace the page.
- Inputs use a visible green focus ring and red error ring.
- Identity fields supplied by Google are read-only.

## Responsive behavior

- Desktop: two-column forms where fields are related; three columns only for
  short compensation values.
- Tablet: two columns maximum.
- Mobile: one column, full-width actions, 44px minimum touch targets.
- No horizontal scrolling at 320px or wider.

## Content voice

Use direct product language:

- “Track every role and keep the next action clear.”
- “Manage referral requests and job-search conversations in one place.”
- “Review the professional context Concourse uses across your workspace.”

Avoid release language, implementation details, decorative slogans, and
repeated explanations inside the product.
