const HANDHELD_WIDTH = 256;
const HANDHELD_HEIGHT = 192;
const PAGE_GUTTER = 48;
const NEW_BARK_LOOP_DURATION_MS = 2000;
const RELEASE_THRESHOLD = 0.9;
const BREAKOUT_DISTANCE_VIEWPORTS = 1.65;
const INITIAL_STAGE_TOP_RATIO = 0.64;
const SMOOTHSTEP_SCALE = 3;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const story = document.querySelector(".story");
const visualStage = document.querySelector(".story__visual");
const sceneSurface = document.querySelector(".scene-surface");

if (
	story instanceof HTMLElement &&
	visualStage instanceof HTMLElement &&
	sceneSurface instanceof HTMLElement
) {
	const motionPreference = globalThis.matchMedia(REDUCED_MOTION_QUERY);

	if (!motionPreference.matches) {
		let mediaMode = "new-bark";
		let newBarkLoopOrigin = globalThis.performance.now();
		let handoffTimeoutId = 0;
		let handoffGeneration = 0;
		let releaseRequested = false;
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

		function cancelHandoff() {
			handoffGeneration += 1;
			if (handoffTimeoutId !== 0) {
				globalThis.clearTimeout(handoffTimeoutId);
				handoffTimeoutId = 0;
			}
		}

		function resetNewBark() {
			cancelHandoff();
			setMediaMode("new-bark");
			newBarkLoopOrigin = globalThis.performance.now();
			releaseRequested = false;
		}

		function armHandoff() {
			if (mediaMode === "rotation" || handoffTimeoutId !== 0) {
				return;
			}

			releaseRequested = true;
			const elapsed = Math.max(
				0,
				globalThis.performance.now() - newBarkLoopOrigin,
			);
			const loopPhase = elapsed % NEW_BARK_LOOP_DURATION_MS;
			let remaining = NEW_BARK_LOOP_DURATION_MS - loopPhase;
			if (loopPhase === 0) {
				remaining = 0;
			}
			handoffGeneration += 1;
			const requestGeneration = handoffGeneration;

			handoffTimeoutId = globalThis.setTimeout(() => {
				handoffTimeoutId = 0;
				if (
					requestGeneration !== handoffGeneration ||
					!releaseRequested ||
					mediaMode !== "new-bark"
				) {
					return;
				}

				setMediaMode("rotation");
				releaseRequested = false;
			}, remaining);
		}

		function reconcileMedia(progress) {
			if (progress < RELEASE_THRESHOLD) {
				if (mediaMode === "rotation") {
					resetNewBark();
					return;
				}

				releaseRequested = false;
				cancelHandoff();
				return;
			}

			if (mediaMode === "new-bark") {
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

			visualStage.style.setProperty("--breakout-progress", String(progress));
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
