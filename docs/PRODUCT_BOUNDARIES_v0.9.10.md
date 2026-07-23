# YeMind v0.9.10 product boundaries

v0.9.10 changes only structured-outline guide rendering and visible-node navigation between canvas and outline.

The release replaces row pseudo-element gradient fragments with one guide overlay, aligns each line beneath its expanded parent triangle and paints every segment once at a uniform width. It also reveals canvas selections inside the outline's local scroll area while retaining existing `GO_TARGET_NODE` canvas navigation from outline clicks.

Map, settings and checkpoint schemas are unchanged. Node identity, clipboard behavior, outline structural editing, canvas drag semantics, themes, image tools and rich-text persistence are not migrated.
