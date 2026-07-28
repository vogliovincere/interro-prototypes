# Interro UI Prototypes

Clickable, static prototypes for Interro's investor-facing embedded widgets.

**Live:** https://vogliovincere.github.io/interro-prototypes/

Every prototype is constrained to a **390px mobile frame**, because Interro ships
these features to customers as embedded widgets — mobile width is the prototyping
standard for anything an end user will see.

## Prototypes

| Prototype | What it covers |
|---|---|
| [Capital Call Wire Instructions](prototypes/wire-details/) | An LP picks a domestic or international wire route, then receives copy-ready wire instructions with a memo code. |

## Dev tools

Each prototype has a **dev-tools panel to the left of the mobile frame**. It is demo
scaffolding only and never ships — it exists so a variant can be switched live
during a walkthrough (layout options, amount-due treatments, memo-code styling,
optional accordions).

Every toggle also has a URL parameter, so a specific variant can be deep-linked
into a deck or a review. For the wire-details prototype:

```
?route=domestic|international   which details screen to open
?layout=side                    payment options side by side (default: stacked)
?amount=plain                   white amount-due row (default: green band)
?due=inline                     due date beside the amount (default: its own row)
?lp=1                           show the LP name under the GP name
?memo=recommended               blue "recommended" memo treatment (default: gold "required")
?additional=1                   "Additional Payment Information" accordion
```

## Running locally

No build step, no dependencies — plain HTML, CSS and JS. Open
`prototypes/wire-details/index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

## Notes

- All data in these prototypes is **fabricated demo data** — fund names, investor
  names, account numbers and routing details are invented.
- `brand/tokens.css` mirrors the production Interro design tokens (Phthalo Green
  `#123524`, accent `#339966`, Aptos / Lora).
- Deploys to GitHub Pages automatically on every push to `main`.
