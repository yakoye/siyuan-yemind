# YeMind v0.9.29 Product Boundaries

- Auto-hide applies only to the top and bottom toolbars; the left history/undo toolbar is unchanged.
- The pin is one shared preference for both toolbars and is stored in YeMind settings.
- Direct zoom editing changes only viewport scale and does not modify map content.
- Renaming changes the map document title and open tab title, not the root-node text.
- Relation hit widening does not change exported relation style or visible width.
- Quick-action counts exclude grandchildren and hidden descendant totals.
- One-level expansion deliberately does not restore every previously open descendant.
- Resource resize handles never persist across view-mode changes.
