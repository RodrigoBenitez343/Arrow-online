# Arrow — Website Draft

Marketing/content draft for the Arrow promotional website, derived from the
product's technical reference (`README.MD`). Brand: **Arrow**. Internal package
name (do not surface in marketing copy): *LoOper*.

## Positioning

Arrow is a Windows desktop platform for building, running, and scheduling
intelligent automation entirely on local hardware. You record any interaction
once, compose it into a visual workflow graph, and execute it deterministically —
with local AI, local vision, local OCR, and local speech.

**No cloud. No telemetry. No per-token fees. Open source.**

## Tagline options

1. "Local AI automation, on your machine." *(primary — leads with the differentiator)*
2. "Automation that sees, reasons, and acts — offline."
3. "Record once. Compose visually. Run locally."

## Hero

- **Headline:** Build AI agents that see, reason, and act — entirely on your machine.
- **Subhead:** Arrow records any interaction once, turns it into a visual workflow
  graph, and runs it deterministically with local AI. No cloud, no telemetry, no
  per-token fees.
- **CTAs:** Join the Beta · See how it works · About Arrow

## Key capabilities (feature cards)

| Icon | Capability | One-liner |
|---|---|---|
| 🎨 | Visual workflow editor | Compose nodes into a graph — not scripts. Branch, loop, and nest. |
| 📹 | Desktop recorder | Capture clicks, typing, scrolls, drags, clipboard, screenshots, and UI elements. |
| 🌐 | Web recorder | DOM-level browser capture via CDP; selector-based, never coordinates. |
| 🧠 | Local AI | llama.cpp + Ollama on-device LLM reasoning. Your data stays private. |
| 👁️ | Vision & OCR | Template matching, ONNX detection, PaddleOCR — find and read any UI. |
| 🗣️ | Speech | Piper neural TTS + Vosk offline STT for voice mode. |
| 🤖 | Agent mode | A "system chain" is the agent's mind; chat overlay + phone client. |
| 🎯 | Orchestrator | Goal loop over mini-brain chains until the job is done. |
| ⏰ | Scheduling | Once / daily / weekly / interval, in-process runs. |
| 🔒 | Sandbox | Isolated RDP sessions keep automation off your active desktop. |
| 📦 | Agent export | Compile a system chain + assets into a standalone .exe. |

## How it works

1. **Record** — capture a desktop sequence or browser flow once.
2. **Compose** — connect typed nodes into a visual chain; branch, loop, nest.
3. **Run** — deterministic execution, with AI only where fuzzy judgment adds value.

## Audience

- Business process automation (finance, HR, ops)
- QA & testing engineers
- IT operations
- AI enthusiasts
- Power users
- RPA developers

## Page-by-page

- **index.html** — hero + capabilities + how-it-works + audience + CTA.
- **about.html** — positioning, pillars, capability map, "why Arrow".
- **docs.html** — browsable documentation derived from README.MD.
- **contact.html** — contact form + info cards.

## Image resources (assets/images/)

- Hero / editor: `main-app-window.png`, `worflowexample.PNG`, `complete.PNG`
- Nodes: `sequence-node.png`, `conditional-node.png`, `llm-node.png`,
  `tts-node.png`, `code-node.png`, `chain-import-node.png`
- Dialogs: `sequence-properties-dialog.png`, `conditional-dialog.png`,
  `llm-config-dialog.png`, `code-node-dialog.png`, `chain-import-dialog.png`,
  `trigger-config-dialog.png`, `scheduler-dialog.png`
- Tooling: `recording-toolbar.png`, `toolbar.png`, `topbar.PNG`
- Click crops: `click-example-1..6.png`
- Background: `bg-parallax.jpg` / `bg-parallax.webp` / `bg-parallax-liquid.jpg`
