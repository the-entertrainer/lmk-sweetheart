# Drop your MP3 here

Add your own copy of the song as:

```
audio/harleys-in-hawaii.mp3
```

`index.html` points its `<audio>` element straight at that path, so nothing
else needs to change once the file exists — refresh and press **Start the
Ride**.

Don't commit an MP3 you don't have the rights to. This folder is git-ignored
on purpose (see `.gitignore`) so the audio stays local/private to your own
deploy — upload it directly in the Vercel dashboard (Project → Storage, or
just keep it out of git and add it to the deployed build another way) if you
don't want it in the public repo.
