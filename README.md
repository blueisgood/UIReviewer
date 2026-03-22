# Prototype Review Kit

This is a reusable static review app for client prototype walkthroughs.
It can run as a plain static site and can save comments to Supabase.

## Files

- `index.html`: the app shell
- `styles.css`: layout and visual styling
- `prototype-review.js`: interaction logic
- `prototype-config.js`: the only file you usually need to edit
- `prototype-assets/`: exported prototype screens
- `supabase-schema.sql`: database table and policies for saved comments
- `supabase-submit-migration.sql`: adds final-submit locking support
- `review-config-schema.sql`: review config table and storage bucket setup
- `create-review.html`: review creation page
- `create-review.js`: upload and hotspot configuration logic
- `scripts/import-review-from-assets.js`: local CLI for importing exported screens
- `scripts/import-from-pencil.js`: bridge command for the Pencil export workflow
- `IMPORT_FROM_PENCIL.md`: local import workflow notes
- `IMPORT_WORKFLOW.md`: short import command reference

## How to use it

1. Replace the images in `prototype-assets/`
2. Update `prototype-config.js`
3. Open `index.html` in a browser

## Create review flow

1. Run `review-config-schema.sql` in Supabase
2. Open `create-review.html`
3. Upload review images
4. Double-click a screen to create a click area
5. Drag and resize the click area
6. Generate the sharable link

After deployment, use:

- `/create-review.html` to create a new review
- `/?review=<slug>` for the client-facing review link

## Local import shortcut

If you already exported screens from Pencil, you can generate a review from the terminal:

```bash
node scripts/import-review-from-assets.js --title "Chip Rotation" --slug "chip-rotation-client-a-v1" --dir prototype-assets --app-url "https://your-project.vercel.app/index.html"
```

Or use the bridge command:

```bash
node scripts/import-from-pencil.js --title "Chip Rotation" --slug "chip-rotation-client-a-v1" --app-url "https://your-project.vercel.app/index.html"
```

## Make it shareable with saved comments

1. Create a Supabase project
2. Run `supabase-schema.sql` in the Supabase SQL editor
3. Run `supabase-submit-migration.sql` in the Supabase SQL editor
4. Copy your project URL and anon key into `prototype-config.js`
5. Deploy this folder to Vercel or Netlify as a static site
6. Share a link like:

```text
https://your-site.example/?review=rotate-chips-flow-v1
```

Optional reviewer-specific link:

```text
https://your-site.example/?review=rotate-chips-flow-v1&reviewer=client-a
```

The app will upsert the comments into Supabase automatically while the user types.
After a successful `Submit`, the review is locked and becomes read-only for that link.

See `DEPLOY.md` for the exact Vercel and Netlify setup.

## Screen config format

Each screen in `prototype-config.js` should look like this:

```js
{
  title: "Step 1",
  subtitle: "Click target: Start",
  image: "./prototype-assets/screen-1.png",
  hotspot: { left: 94.6, top: 29.7, width: 5.0, height: 4.9 }
}
```

If a screen has no click target, set:

```js
hotspot: null
```

## Future workflow

For future projects, you can give me:

- exported prototype screens
- the click order
- hotspot targets per screen
- your notes template

Then I can regenerate this review kit in the same format for client sharing.
