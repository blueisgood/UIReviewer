# Deploy

## Vercel

1. Push this folder to a Git repo.
2. Import the repo into Vercel.
3. Framework preset: `Other`.
4. Build command: leave empty.
5. Output directory: leave empty.
6. Deploy.

Your review URL will look like:

```text
https://your-project.vercel.app/?review=rotate-chips-flow-v1
```

Your create-review URL will look like:

```text
https://your-project.vercel.app/create-review.html
```

## Netlify

1. Push this folder to a Git repo.
2. Import the repo into Netlify.
3. Build command: leave empty.
4. Publish directory: `.`
5. Deploy.

Your review URL will look like:

```text
https://your-project.netlify.app/?review=rotate-chips-flow-v1
```

Your create-review URL will look like:

```text
https://your-project.netlify.app/create-review.html
```

## Current limitation

This is deployed as a static review app with a basic create-review flow.
It still does not have a full admin dashboard for managing many reviews in one place.
