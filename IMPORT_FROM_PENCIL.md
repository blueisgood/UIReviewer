# Import From Pencil

Current state:

- The review product now has a browser-based `create-review.html`
- There is also a local CLI for fast import from exported screen images

## Why this is not a Pencil plugin

The local CLI cannot directly call the Pencil MCP tools that exist in this Codex session.
So the practical first version is:

1. Export screens from Pencil
2. Run the import CLI
3. Get a sharable review link

## CLI

Run from the project root:

```bash
node scripts/import-review-from-assets.js --title "Chip Rotation" --slug "chip-rotation-client-a-v1" --dir prototype-assets --app-url "https://your-project.vercel.app/index.html"
```

Or use the bridge command:

```bash
node scripts/import-from-pencil.js --title "Chip Rotation" --slug "chip-rotation-client-a-v1" --app-url "https://your-project.vercel.app/index.html"
```

## What it does

- Reads all images from the given directory
- Uploads them to the Supabase `review-assets` bucket
- Creates a review config in `prototype_review_configs`
- Prints the sharable review link

## Typical workflow with Pencil

1. Export the selected Pencil frames into `prototype-assets/`
2. Run the import CLI
3. Open the generated link
4. Fine-tune click areas in the review app if needed

## Future improvement

If you want true one-click import from Pencil selection, the next step is to add a local bridge that exports the current Pencil selection first and then calls this CLI.
