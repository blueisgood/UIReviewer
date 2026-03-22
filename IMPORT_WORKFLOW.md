# Import Workflow

## Current bridge command

There is no local Pencil CLI in this environment, so the current `import-from-pencil` flow is:

1. Export selected Pencil frames into `prototype-assets/`
2. Run:

```bash
node scripts/import-from-pencil.js --title "Chip Rotation" --slug "chip-rotation-client-a-v1" --app-url "https://your-project.vercel.app/index.html"
```

3. The command will:

- upload the images to Supabase storage
- create the review config
- print the sharable link

## Why this exists

This gives you a single review-import command today, without waiting for a deeper Pencil integration.

## Next level integration

If you want true one-step import from the current Pencil selection, the next step is a local bridge that exports the selected frames first, then calls this command automatically.
