# Fieldnotes

Practise a shift handover in English or German. Read a set of workplace measurements, choose what to report and check the log entries that support your answer. The exercises cover a building facade and a community kitchen. All readings are synthetic.

[Open the free practice site](https://ambrosinistefan8-stack.github.io/fieldnotes-hybrid-ai/) · [Watch the English jury demo on YouTube](https://youtu.be/IhMXrPadoSI)

In **Facade inspection**, try entering 30 °C for the change in the south-wall temperature. Select **Show evidence** to compare the first and last readings. In **Community kitchen handover**, the last question asks what to report for minute 15 when the record ends at minute 10. Switch languages at any time to keep your place.

## Run the exercises

Open `index.html` in a browser. The downloaded file works offline. The public site uses the same file. Practice state stays in memory, and the page blocks outgoing connections.

To rebuild or serve the project, use Node.js and npm.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4178. Run `npm test` for the unit and server checks. With desktop Chrome installed, `npm run test:browser` exercises the English and German interfaces.

## How the device coach works

Each question has two reviewed coaching steps. In a separate, invited-adult test on this device, Firebase AI Logic receives the question, the learner’s selected option, the two coaching steps and their evidence. The model chooses A or B. Fieldnotes displays the selected step with the exact recorded rows. If the reply cannot be used, it shows the handbook guidance.

The local device-only build uses Firebase AI Logic’s `ONLY_ON_DEVICE` mode. Four offline checks in Chrome 157.0.8103.51 with the Firebase JavaScript SDK 13.4.0 returned `on_device` across both exercises and languages. The Chrome model broker reported `gemma4_component 2026.8.7.929` ready. A fifth English check covered the missing minute-15 reading. The SDK reports the inference route. Chrome reports the installed model version.

### Reproduce the device-only test

1. Use desktop Chrome on a supported computer with room for the local model. In the tested Chrome 157 setup, a separate browser profile had **Gemma 4 for Built-in AI** enabled at `chrome://flags/#gemma4-for-built-in-ai` and Chrome was restarted. The original profile on that computer contained an older model. Chrome downloads its model on demand, and an initial download requires an internet connection. Before testing offline, verify that `chrome://on-device-internals` shows `prompt_api_gemma4 Available` under **Broker State**. [Chrome hardware requirements](https://developer.chrome.com/docs/ai/prompt-api#hardware) · [Chrome model management](https://developer.chrome.com/docs/ai/understand-built-in-model-management) · [Chromium 157 model switch](https://github.com/chromium/chromium/blob/157.0.8103.51/chrome/browser/about_flags.cc#L4830-L4834)
2. In a fresh checkout, run the following from the repository root. The second command writes the three synthetic identifiers used in the device test into a new, git-ignored local file. It stops if that file already exists.

```sh
npm ci
node -e "const fs=require('node:fs');const firebase={projectId:'demo-fieldnotes',appId:'demo-local-app-id',apiKey:'demo-local-not-an-api-key'};fs.writeFileSync('local-settings.js','window.FIELDNOTES_SETTINGS='+JSON.stringify({firebase})+';', {flag:'wx'});"
node scripts/build.mjs --device
node scripts/serve.mjs --device
```

3. The server binds to loopback and displays a single-use invitation. Give it only to the invited adult tester. Open the local address, complete admission and select a question. Open **Coach for this question**, select the on-device consent box and click **Ask AI to choose a coaching step**. The result identifies the inference source and quotes its supporting rows.

The device build blocks outbound requests. In a separate Firebase project on the Spark plan, two token exchanges using the registered App Check debug provider returned HTTP 200. For each token that Firebase issued, we verified the RS256 signature, issuer, project audience, app ID and expiration. Production reCAPTCHA attestation and live cloud-model fallback remain untested. See the [integration source](src/hybrid.js) and the [Firebase hybrid web guide](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started).

## License

The original source is available under Apache-2.0. The bundled Firebase SDK includes Apache-2.0 notices, and its IndexedDB helper carries an ISC license. [Project license](LICENSE) · [IndexedDB helper license](LICENSE-idb.txt)
