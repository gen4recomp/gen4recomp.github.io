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
const TYPEWRITER_ENTRY_THRESHOLD = 0.35;

const story = document.querySelector(".story");
const visualStage = document.querySelector(".story__visual");
const sceneSurface = document.querySelector(".scene-surface");

if (
	story instanceof HTMLElement &&
	visualStage instanceof HTMLElement &&
	sceneSurface instanceof HTMLElement
) {
	const motionPreference = globalThis.matchMedia(REDUCED_MOTION_QUERY);
	const dialogueBoxes = Array.from(
		document.querySelectorAll(".dialogue-box"),
	).filter((dialogueBox) => dialogueBox instanceof HTMLElement);

	function wait(duration) {
		return new Promise((resolve) => {
			globalThis.setTimeout(resolve, duration);
		});
	}

	async function typeText(target, fullText, characterCount = 1) {
		if (characterCount > fullText.length) {
			return;
		}

		target.textContent = fullText.slice(0, characterCount);
		await wait(TYPEWRITER_CHARACTER_DELAY_MS);
		return typeText(target, fullText, characterCount + 1);
	}

	async function typeTargets(visualTargets, targetIndex = 0) {
		if (targetIndex >= visualTargets.length) {
			return;
		}

		const visualTarget = visualTargets[targetIndex];
		const accessibleSource = visualTarget.previousElementSibling;
		if (accessibleSource instanceof HTMLElement) {
			await typeText(visualTarget, accessibleSource.textContent.trim());
		}

		return typeTargets(visualTargets, targetIndex + 1);
	}

	async function typeDialogue(dialogueBox) {
		if (dialogueBox.dataset.typingStarted === "true") {
			return;
		}

		dialogueBox.dataset.typingStarted = "true";
		dialogueBox.classList.add("dialogue-box--typing");

		const visualTargets = Array.from(
			dialogueBox.querySelectorAll(".dialogue-box__visual"),
		).filter((target) => target instanceof HTMLElement);
		await typeTargets(visualTargets);
	}

	if (!motionPreference.matches && "IntersectionObserver" in globalThis) {
		const dialogueObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (
						entry.isIntersecting &&
						entry.intersectionRatio >= TYPEWRITER_ENTRY_THRESHOLD &&
						entry.target instanceof HTMLElement
					) {
						dialogueObserver.unobserve(entry.target);
						typeDialogue(entry.target);
					}
				}
			},
			{ threshold: TYPEWRITER_ENTRY_THRESHOLD },
		);

		for (const dialogueBox of dialogueBoxes) {
			dialogueObserver.observe(dialogueBox);
		}
	}

	if (!motionPreference.matches) {
		let mediaMode = "new-bark";
		const newBarkLoopOrigin = globalThis.performance.now();
		let handoffTimeoutId = 0;
		let layoutFrameId = 0;

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
				if (mediaMode !== "new-bark") {
					return;
				}

				setMediaMode("rotation");
			}, remaining);
		}

		function reconcileMedia(progress) {
			if (mediaMode === "rotation") {
				return;
			}

			if (progress >= RELEASE_THRESHOLD) {
				armHandoff();
			}
		}

		function updateLayout() {
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
			if (layoutFrameId === 0) {
				layoutFrameId = globalThis.requestAnimationFrame(() => {
					layoutFrameId = 0;
					updateLayout();
				});
			}
		}

		sceneSurface.dataset.media = mediaMode;
		updateLayout();
		globalThis.addEventListener("scroll", scheduleLayoutUpdate, {
			passive: true,
		});
		globalThis.addEventListener("resize", scheduleLayoutUpdate);
	}
}
