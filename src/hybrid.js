import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from 'firebase/ai';
import { buildHintPrompt, coachGuide } from './recall.js';

export function configured(settings, mode = 'hybrid') {
  const fields = [settings?.firebase?.projectId, settings?.firebase?.apiKey, settings?.firebase?.appId];
  if (mode === 'hybrid') fields.push(settings?.appCheckSiteKey);
  return fields.every(value => typeof value === 'string' && value.trim().length > 0);
}

// This factory only executes after the learner presses the hybrid hint button.
let appCheck;
export function createHintModel(settings, language, mode) {
  const app = initializeApp(settings.firebase, 'fieldnotes');
  if (mode === 'hybrid' && !appCheck) {
    appCheck = initializeAppCheck(app, {provider: new ReCaptchaEnterpriseProvider(settings.appCheckSiteKey), isTokenAutoRefreshEnabled: true});
  }
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    mode: mode === 'hybrid' ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { createOptions: {
      expectedInputs: [{type: 'text', languages: language === 'de' ? ['en', 'de'] : ['en']}],
      expectedOutputs: [{type: 'text', languages: [language]}]
    }}
  });
}

export async function generateHint({round, language, settings, mode = 'offline', consent, makeModel = createHintModel, signal, onProgress}) {
  if (!['device','hybrid'].includes(mode) || !consent || !configured(settings, mode)) throw new Error('configuration');
  if (signal?.aborted) throw new Error('cancelled');
  const model = makeModel(settings, language, mode);
  // Begin device setup within the button activation. A device setup error can still
  // use the SDK fallback because the caller already authorized cloud processing.
  try { await model.initializeDeviceModel(onProgress); } catch (err) {
    if (mode === 'device') throw err;
  }
  if (signal?.aborted) throw new Error('cancelled');
  const { response } = await model.generateContent(buildHintPrompt(round, language), { signal });
  if (signal?.aborted) throw new Error('cancelled');
  if (![InferenceSource.ON_DEVICE, InferenceSource.IN_CLOUD].includes(response.inferenceSource)) throw new Error('source');
  if (mode === 'device' && response.inferenceSource !== InferenceSource.ON_DEVICE) throw new Error('source');
  // Only the exact identifiers for this question can select learner-visible content.
  // Even blocked or malformed model text cannot replace the lesson's measurements.
  let selection;
  try { selection = response.text()?.trim(); } catch { /* The SDK may withhold text. */ }
  const accepted = selection === 'A' || selection === 'B';
  return {
    ...coachGuide(round, language, accepted ? selection : 'A'),
    source: response.inferenceSource,
    kind: accepted ? 'model-selected' : 'editorial-invalid',
    selection: accepted ? selection : null
  };
}
