# StellarPay ERP — Master design system

## Product fit

StellarPay ERP is a B2B operational and financial workspace for invoice, stock, purchasing, production, and Stellar Testnet settlement. Its primary job is to show the next actionable record before presenting a summary.

The product uses a soft operational dashboard style: 16–20 px rounded work surfaces, generous 14–22 px gaps, tabular numbers, and one red settlement rail. Red is used for direct actions and the settlement surface, never as a decorative left-edge accent. It is not a landing page and does not use a marketing hero, gradients, decorative process art, or repeated card mosaics.

Operations use direct, duotone Phosphor glyphs at a useful reading size; they are not placed inside outlined square icon tiles or paired with ornamental ordinal numbers. Small Lucide icons remain for familiar controls such as navigation, close, refresh, and disclosure.

## Color tokens

| Token | Light | Dark | Purpose |
|---|---:|---:|---|
| `--bg` | `#F2F3F1` | `#121315` | App background |
| `--surface` | `#FFFFFF` | `#191A1D` | Working surface |
| `--text` | `#111214` | `#F2F2F0` | Primary text |
| `--muted` | `#666A70` | `#9A9DA3` | Supporting copy |
| `--border` | `#D8DADD` | `#37393E` | Rules and separators |
| `--accent` | `#D51F3C` | `#FF4964` | Primary action and selected state |
| `--accent-soft` | `#FFF0F2` | `#351820` | Pressed and selected surface |
| `--info` | `#2554C7` | `#83A7FF` | Chain information |

Normal text must meet WCAG AA 4.5:1 against its active surface. Status always combines color with text and an icon or dot.

## Typography and spacing

- UI family: `Helvetica Neue`, Arial, sans-serif.
- Headings: 700–720; body: 400; labels: 650–700.
- Use tabular figures for amounts, quantities, and codes.
- Body copy is 14–16 px at narrow widths and uses 1.5 or higher line-height.
- Spacing follows 4/8 px increments: 8, 12, 16, 20, 24, 32, 40.
- Controls remain at least 40 px high on desktop and 44 px on narrow touch screens.

## Layout

```text
Desktop ≥ 1024
[navigation 238][top bar]
                 [page title + single primary action]
                 [contiguous status strip]
                 [action queue             ][red settlement rail]
                 [operational line / ledger]

Tablet 768–1023
[drawer navigation] [single content column with rail below queue]

Phone < 768
[menu + essential controls]
[title and primary action]
[two-column status strip]
[queue]
[settlement rail]
```

Tables keep their semantic structure and may scroll horizontally inside their own `.table-scroll` wrapper; the document itself must never scroll horizontally.

## Interaction and accessibility

- Semantic `button`, `a`, `nav`, `main`, `section`, heading, label, table, and dialog elements are retained.
- Every icon-only control has an accessible name. Icons paired with a visible label are decorative.
- Keyboard focus uses a visible 3 px ring and stays unobscured by fixed header or drawer layers.
- `prefers-reduced-motion: reduce` disables nonessential animation and transitions.
- Menus and dialogs support keyboard navigation and Escape dismissal.
- Text wraps instead of clipping; long IDs use `overflow-wrap: anywhere`.
- Primary actions work with click, tap, and keyboard. Hover is an enhancement only.

## Page overrides

- `pages/overview.md`: operational queue first; compact, separated summary cards are allowed but do not add a hero or a metric-card mosaic.
- `pages/finance.md`: ERP liabilities precede the ledger; Anchor and escrow are operational states, not decorative illustrations.
