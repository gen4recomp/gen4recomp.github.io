if ("scrollRestoration" in globalThis.history) {
	globalThis.history.scrollRestoration = "manual";
}
globalThis.scrollTo(0, 0);

const HANDHELD_WIDTH = 256;
const HANDHELD_HEIGHT = 192;
const PAGE_GUTTER = 48;
const NEW_BARK_LOOP_DURATION_MS = 2000;
const RELEASE_THRESHOLD = 0.9;
const BREAKOUT_DISTANCE_VIEWPORTS = 1.65;
const INITIAL_STAGE_TOP_RATIO = 0.64;
const SMOOTHSTEP_SCALE = 3;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const TYPEWRITER_CHARACTER_DELAY_MS = 30;
const DIALOGUE_RECRUITMENT_THRESHOLD = 0.6;
const DIALOGUE_PLANNED_THRESHOLD = 0.45;
const DIALOGUE_BOTTOM_OFFSET_PX = 32;

const story = document.querySelector(".story");
const visualStage = document.querySelector(".story__visual");
const sceneSurface = document.querySelector(".scene-surface");
const dialogueRegion = document.querySelector(".story__dialogue-region");
const dialogueBox = document.querySelector(".dialogue-box");
const dialogueVisual = document.querySelector(".dialogue-box__visual");
const semanticMessages = Array.from(
	document.querySelectorAll("[data-dialogue-message]"),
).filter((message) => message instanceof HTMLElement);

if (
	story instanceof HTMLElement &&
	visualStage instanceof HTMLElement &&
	sceneSurface instanceof HTMLElement
) {
	const motionPreference = globalThis.matchMedia(REDUCED_MOTION_QUERY);
	let layoutFrameId = 0;
	let mediaMode = "new-bark";
	const newBarkLoopOrigin = globalThis.performance.now();
	let handoffTimeoutId = 0;

	function clamp(value, minimum, maximum) {
		return Math.min(Math.max(value, minimum), maximum);
	}

	function setMediaMode(nextMode) {
		if (mediaMode === nextMode) {
			return;
		}

		mediaMode = nextMode;
		sceneSurface.dataset.media = nextMode;
	}

	function armHandoff() {
		if (mediaMode === "rotation" || handoffTimeoutId !== 0) {
			return;
		}

		const elapsed = Math.max(
			0,
			globalThis.performance.now() - newBarkLoopOrigin,
		);
		const loopPhase = elapsed % NEW_BARK_LOOP_DURATION_MS;
		let remaining = NEW_BARK_LOOP_DURATION_MS - loopPhase;
		if (loopPhase === 0) {
			remaining = 0;
		}

		handoffTimeoutId = globalThis.setTimeout(() => {
			handoffTimeoutId = 0;
			if (mediaMode === "new-bark") {
				setMediaMode("rotation");
			}
		}, remaining);
	}

	function reconcileMedia(progress) {
		if (motionPreference.matches || mediaMode === "rotation") {
			return;
		}

		if (progress >= RELEASE_THRESHOLD) {
			armHandoff();
		}
	}

	function wait(duration) {
		return new Promise((resolve) => {
			globalThis.setTimeout(resolve, duration);
		});
	}

	function getMessageText(message) {
		const heading = message.querySelector("h2")?.textContent.trim() ?? "";
		const listItems = Array.from(message.querySelectorAll("li"), (item) =>
			item.textContent.trim(),
		);
		if (listItems.length > 0) {
			return [heading, "", ...listItems.map((item) => `• ${item}`)].join("\n");
		}

		const paragraphs = Array.from(message.querySelectorAll("p"), (paragraph) =>
			paragraph.textContent.trim(),
		);
		return [heading, "", ...paragraphs].join("\n");
	}

	if (
		dialogueRegion instanceof HTMLElement &&
		dialogueBox instanceof HTMLElement &&
		dialogueVisual instanceof HTMLElement &&
		semanticMessages.length === 2
	) {
		const dialogueTextByState = Object.fromEntries(
			semanticMessages.map((message) => [
				message.dataset.dialogueMessage,
				getMessageText(message),
			]),
		);
		let requestedDialogueState = "empty";
		let displayedDialogueText = "";
		let dialogueOperationActive = false;
		let dialogueStarted = false;

		function getTargetDialogueText() {
			return dialogueTextByState[requestedDialogueState] ?? "";
		}

		async function typeNextDialogueCharacter() {
			if (displayedDialogueText === getTargetDialogueText()) {
				return;
			}

			if (motionPreference.matches) {
				displayedDialogueText = getTargetDialogueText();
				dialogueVisual.textContent = displayedDialogueText;
				return;
			}

			const targetText = getTargetDialogueText();
			displayedDialogueText += targetText.charAt(displayedDialogueText.length);
			dialogueVisual.textContent = displayedDialogueText;
			await wait(TYPEWRITER_CHARACTER_DELAY_MS);
			return typeNextDialogueCharacter();
		}

		async function reconcileDialogue() {
			if (dialogueOperationActive) {
				return;
			}

			dialogueOperationActive = true;
			try {
				await typeNextDialogueCharacter();
			} finally {
				dialogueOperationActive = false;
				if (displayedDialogueText !== getTargetDialogueText()) {
					reconcileDialogue();
				}
			}
		}

		function requestDialogueState(nextState) {
			if (requestedDialogueState === nextState) {
				return;
			}

			requestedDialogueState = nextState;
			if (motionPreference.matches) {
				displayedDialogueText = getTargetDialogueText();
				dialogueVisual.textContent = displayedDialogueText;
				return;
			}

			displayedDialogueText = "";
			dialogueVisual.textContent = "";
			reconcileDialogue();
		}

		function updateDialogue() {
			const viewportHeight = Math.max(1, globalThis.innerHeight);
			const dialogueBoxRect = dialogueBox.getBoundingClientRect();
			const settledTop =
				viewportHeight - dialogueBoxRect.height - DIALOGUE_BOTTOM_OFFSET_PX;
			if (
				!dialogueStarted &&
				dialogueBoxRect.top <= settledTop &&
				dialogueBoxRect.bottom > 0
			) {
				dialogueStarted = true;
				requestDialogueState("planned-features");
			}

			if (!dialogueStarted) {
				return;
			}

			const regionHeight = Math.max(
				1,
				dialogueRegion.offsetHeight - viewportHeight,
			);
			const dialogueProgress = clamp(
				-dialogueRegion.getBoundingClientRect().top / regionHeight,
				0,
				1,
			);
			if (
				requestedDialogueState === "planned-features" &&
				dialogueProgress >= DIALOGUE_RECRUITMENT_THRESHOLD
			) {
				requestDialogueState("recruitment");
			} else if (
				requestedDialogueState === "recruitment" &&
				dialogueProgress < DIALOGUE_PLANNED_THRESHOLD
			) {
				requestDialogueState("planned-features");
			}
		}

		function updateLayout() {
			updateDialogue();

			if (motionPreference.matches) {
				return;
			}

			const viewportWidth = Math.max(1, globalThis.innerWidth);
			const viewportHeight = Math.max(1, globalThis.innerHeight);
			const containedWidth = Math.min(
				HANDHELD_WIDTH,
				Math.max(1, viewportWidth - PAGE_GUTTER),
			);
			const containedHeight =
				containedWidth * (HANDHELD_HEIGHT / HANDHELD_WIDTH);
			const horizontalInset = Math.max(0, (viewportWidth - containedWidth) / 2);
			const initialTop = clamp(
				viewportHeight * INITIAL_STAGE_TOP_RATIO - containedHeight / 2,
				0,
				Math.max(0, viewportHeight - containedHeight),
			);
			const progress = clamp(
				-story.getBoundingClientRect().top /
					(BREAKOUT_DISTANCE_VIEWPORTS * viewportHeight),
				0,
				1,
			);
			const easedProgress =
				progress * progress * (SMOOTHSTEP_SCALE - 2 * progress);
			const insetScale = 1 - easedProgress;

			story.style.setProperty("--breakout-progress", String(progress));
			visualStage.style.setProperty(
				"--stage-inset-top",
				`${initialTop * insetScale}px`,
			);
			visualStage.style.setProperty(
				"--stage-inset-right",
				`${horizontalInset * insetScale}px`,
			);
			visualStage.style.setProperty(
				"--stage-inset-bottom",
				`${Math.max(0, viewportHeight - initialTop - containedHeight) * insetScale}px`,
			);
			visualStage.style.setProperty(
				"--stage-inset-left",
				`${horizontalInset * insetScale}px`,
			);
			reconcileMedia(progress);
		}

		function scheduleLayoutUpdate() {
			if (layoutFrameId !== 0) {
				return;
			}

			layoutFrameId = globalThis.requestAnimationFrame(() => {
				layoutFrameId = 0;
				updateLayout();
			});
		}

		sceneSurface.dataset.media = mediaMode;
		updateLayout();
		globalThis.addEventListener("scroll", scheduleLayoutUpdate, {
			passive: true,
		});
		globalThis.addEventListener("resize", scheduleLayoutUpdate);
	}
}
