# Cat sprite generation record

The sprite sheet was generated with the built-in `imagegen` mode, followed by one built-in edit pass (`num_last_images_to_include: 1`). No CLI image-generation fallback was used. The corrected chroma-key sheet was converted locally to transparency with threshold-based chroma removal; the conversion utility is not part of this repository and is not required to build or use the plugin.

## Built-in generation prompt

```text
Use case: stylized-concept
Asset type: production sprite sheet for a DSH Web UI bedtime-reminder mascot
Primary request: Create one exact 4 columns by 2 rows sprite sheet showing the SAME adorable anime-inspired minimalist line-art cat mascot in eight animation poses for a web interface: 1) only ears and eyes peeking over an edge, 2) head peeking higher, 3) head and one paw climbing up, 4) both paws resting on the edge, 5) gentle blink, 6) pleading puppy-eye expression with paws together, 7) sleepy yawn, 8) content sleepy smile with a tiny nightcap tilted to one side.
Scene/backdrop: a perfectly flat solid #00ff00 chroma-key background across the entire image for background removal. No panel borders, no separators, no labels.
Subject: one consistent small round-faced cat; warm ivory face fill; charcoal-brown clean outline; blush-pink inner ears and cheeks; simple dark oval eyes; tiny triangle nose. The cat is an opaque flat illustration with smooth clean edges and absolutely no realistic fur or fuzzy hair.
Style/medium: polished Japanese stationery mascot, simple hand-drawn anime line art, flat vector-like cel illustration, charming and calm, suitable at 64-96 CSS pixels.
Composition/framing: exact equal 4x2 grid, each pose centered within its invisible cell, consistent scale and head proportions, generous padding, no pose crosses a cell boundary. Front view or very slight three-quarter view only.
Color palette: warm ivory #FFF6E8, charcoal brown #51443E, blush pink #F3A6AE; do not use green anywhere in the subject.
Constraints: same identity, outline weight, colors, facial proportions and rendering style in every cell; no words, no letters, no numbers, no watermark, no panel borders, no cast shadow, no contact shadow, no reflection. Background must be one uniform #00ff00 with no gradients, texture, lighting variation, floor plane, or shadows. Crisp silhouette and generous padding.
Avoid: photorealism, detailed fur, 3D render, painterly textures, extra cats, props except the tiny nightcap in pose 8, text, labels, grids, separators, logos.
```

## Built-in edit prompt

```text
Use case: precise-object-edit / background-extraction
Input images: Image 1: edit target, the 4x2 cat mascot sprite sheet just generated
Primary request: Change ONLY the entire background to one perfectly flat, exact solid #00ff00 chroma-key color for local background removal.
Constraints: preserve all eight cat drawings exactly — same identity, pose, linework, colors, proportions, placement, 4x2 layout, nightcap, paws, expressions, cell spacing and image dimensions. Remove all background gradient, vignette, glow, panel shading, cast shadows, contact shadows and reflections. The background must be exactly one uniform #00ff00 everywhere that is not part of a cat. Do not add panel borders, separators, text, labels, logos or watermarks. Do not use #00ff00 inside any cat. Keep crisp clean edges. Change only the background; keep every mascot pixel visually unchanged.
```
