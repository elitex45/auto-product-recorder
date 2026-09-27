# hello-film

The starter project that `npm run new -- <name>` makes, rendered as is: a headline whose words land on
the beat, then an end card. 7 s, synth music, no voice. Use it to check that a machine is set up, and
as the smallest example of a film.

```bash
.venv/bin/python scripts/music.py demos/hello-film
npm run film -- demos/hello-film
npm run check -- demos/hello-film/hello-film.mp4
```

The check found three gaps in the first version of this template: empty frames 1–12, an empty frame
150 between the scenes, and a frozen end card. It now passes with blank none and frozen none.
