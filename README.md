# Joyvelope · Reference Template Update

Eight standalone templates are listed on **Create a gift** and **Templates**. Each template keeps its own scene order, layout, colours and artwork. Select a scene to edit the heading, message and interactive text. PIN scenes have an editable four-digit code. The sample PIN is **1107**. Gift creators can supply up to six photos.

| Reference | Template | Major scenes |
| --- | --- | --- |
| 13067 | Birthday Party | Envelope, lights, cake cut, candle, photos, letter |
| 13068 | Secret Birthday Gift | Theatre curtain, PIN, heart boxes, photo wall, wish |
| 13069 | Midnight Birthday | Gift box, PIN, countdown, candle, balloons, puzzle, scratch reveal, letter |
| 13070 | Our Firsts | Anniversary card, calendar, milestones, letter |
| 13071 | From Me to You | Gift box, roses, keypad, photo wall, letter |
| 13072 | You’ve Got Mail | Envelope hub, letter, ten reasons, sample soundtrack, memories |
| 13073 | I’m Sorry, Panda | Floral card, panda, response buttons, penguin reveal |
| 13076 | Catch a Little Love | Bunny, apology, notes, photos, heart-catching game |

The reference MP4s were used to recreate the layouts and interactions. The included PNG backgrounds and character illustrations are new artwork. The original PNG layers, reference photos and soundtrack were unavailable. Photo slots show sample placeholders until the creator uploads pictures. The soundtrack chapter plays original sample tones. The PIN is a reveal interaction. A holder of the unlisted link can retrieve the gift data.

## Try locally

Serve `site/` over HTTP (for example `python3 -m http.server 8080 --directory site`) and open `http://localhost:8080/#experiences`. Select any card, edit a scene and use **Play as recipient**. The site config contains Joyvelope’s existing public HTTPS endpoints. Publish to the live project after deploying the matching function and website.

## Deploy to the existing Joyvelope website and Android app

1. In Supabase Edge Functions, open the existing **rapid-api** and replace its `index.ts` with `backend/index.ts` from this package. Keep the same slug and verify the function's existing JWT and origin settings after deploying the update. The current database table already stores JSON payloads. The older `backend/schema.sql` is supplied for reference.
2. Copy the **contents of `site/`** to the root of the current GitHub Pages repository, keeping the `assets/` subdirectory. Wait for Pages to deploy before publishing links from the new APK. New links use `#show=` and a short token. Previous-format links remain supported.
3. In the existing Android project, copy the same site files to the asset directory its WebView loads. Follow the supplied Derle prompt to merge `android/JoyvelopeWindow.kt` and launcher resources into the actual Android source. The Kotlin file is a source patch. Add the app's package declaration or merge the function into its existing activity.
4. Keep the existing photo picker, HTTPS bridge and Android share sheet. Run the prompt's tests and build command in Derle.

## Verification

- JavaScript and service-worker syntax, TypeScript syntax after removing type annotations, Android resource XML and archive contents were checked.
- The JavaScript harness exercised all eight template flows, scene text escaping, saved drafts, candle reveal, PIN validation, countdown, hearts, puzzle, scratch reveal and in-app Back. The publish/read test used a simulated Supabase response to verify the short link, saved scene text and recipient photo output.
- The updated Supabase function and GitHub Pages site must be deployed in their existing accounts. A live recipient test, visual browser/device checks, Kotlin compilation and APK build are pending in the actual app project.
