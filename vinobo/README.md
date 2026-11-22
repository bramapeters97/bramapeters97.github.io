# Vinobo

![Vinobo Logo](public/titleLogo.png)

Video Notebook for students.

## Description

The application allows the user to watch a Youtube video and search for keywords in the video's transcript
to find relevant parts in the video.
The user will also be able to annotate the video with personal notes, placed at specific times in the video.
Signing in allows the user to save their videos and notes in their account.

## Features

### What we have done

- A custom API endpoint for getting Youtube transcripts.
- Pasting Youtube link and view the video.
- Searching in the transcript.
- Adding/deleting a video to the model.
- Adding/deleting notes.
- Logo.
- Persistence (keeping user data saved if they sign in).
- Auto-scrolling of transcript ~~and notes~~ while the video is playing.
- Searching in notes.

### What we want to add

- Edit notes after they've been saved.
- Organize/order your saved videos with tags/folders/...

### What we would have wanted to add

- Persistance in localStorage until the first time a user signs in.
- Text formatting notes with for example Markdown.
- Sharing your notes on a video (collaboratively or read-only) with a link.
- Dictionary function (look up word definitions with a 2nd API).

## Developing

The portfolio builds and serves Vinobo from `/vinobo/`. From the portfolio root,
run `npm ci`, `npm run build` and `npx wrangler pages dev dist` to run the
static pages and the transcript Function together.

The React pages, presenters, views and Firebase model live in this folder.
The transcript handler is in `../functions/vinobo/api/get_transcript.js`.
It retrieves public YouTube captions and caches successful results for one day.
Transcript offsets and durations use milliseconds. Notebook timestamps use seconds.
