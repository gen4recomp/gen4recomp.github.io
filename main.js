const NEW_BARK_END_SECONDS = 8;
const LOCATION_2_END_SECONDS = 16;
const REEL_END_SECONDS = 24;
const HANDHELD_WIDTH = 256;
const HANDHELD_HEIGHT = 192;
const PAGE_GUTTER = 48;
const MILLISECONDS_PER_SECOND = 1000;
const MAX_FRAME_DELTA_SECONDS = 0.25;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const visualStage = document.querySelector(".story__visual");
const screenTwo = document.querySelector(".story__beat--payoff");

if (visualStage instanceof HTMLElement && screenTwo instanceof HTMLElement) {
	const motionPreference = globalThis.matchMedia(REDUCED_MOTION_QUERY);

	if (!motionPreference.matches) {
		let logicalTimeSeconds = 0;
		let released = false;
		let currentScene = visualStage.dataset.scene ?? "new-bark";
		let lastTimestamp = 0;
		let frameRequest = 0;
		let layoutRequested = false;

		function clamp(value, minimum, maximum) {
			return Math.min(Math.max(value, minimum), maximum);
		}

		function updateReel(timestamp) {
			if (document.visibilityState === "hidden") {
				lastTimestamp = 0;
				return;
			}

			if (lastTimestamp > 0) {
				const elapsedSeconds = Math.min(
					(timestamp - lastTimestamp) / MILLISECONDS_PER_SECOND,
					MAX_FRAME_DELTA_SECONDS,
				);
				logicalTimeSeconds += elapsedSeconds;
			}
			lastTimestamp = timestamp;

			let loopEnd = NEW_BARK_END_SECONDS;
			if (released) {
				loopEnd = REEL_END_SECONDS;
			}
			logicalTimeSeconds %= loopEnd;

			let scene = "new-bark";
			if (released && logicalTimeSeconds >= LOCATION_2_END_SECONDS) {
				scene = "location-3";
			} else if (released && logicalTimeSeconds >= NEW_BARK_END_SECONDS) {
				scene = "location-2";
			}

			if (scene !== currentScene) {
				currentScene = scene;
				visualStage.dataset.scene = scene;
			}
		}

		function updateLayout() {
			const screenTwoRect = screenTwo.getBoundingClientRect();
			const viewportWidth = globalThis.innerWidth;
			const viewportHeight = globalThis.innerHeight;
			const containedWidth = Math.max(
				1,
				Math.min(HANDHELD_WIDTH, viewportWidth - PAGE_GUTTER),
			);
			const containedHeight =
				containedWidth * (HANDHELD_HEIGHT / HANDHELD_WIDTH);
			const initialInsets = {
				top: Math.max(0, (viewportHeight - containedHeight) / 2),
				right: Math.max(0, (viewportWidth - containedWidth) / 2),
				bottom: Math.max(0, (viewportHeight - containedHeight) / 2),
				left: Math.max(0, (viewportWidth - containedWidth) / 2),
			};
			const progress = clamp(1 - screenTwoRect.top / viewportHeight, 0, 1);
			const insets = {
				top: initialInsets.top * (1 - progress),
				right: initialInsets.right * (1 - progress),
				bottom: initialInsets.bottom * (1 - progress),
				left: initialInsets.left * (1 - progress),
			};

			if (progress >= 1 && !released) {
				released = true;
			} else if (progress <= 0 && released) {
				released = false;
				logicalTimeSeconds %= NEW_BARK_END_SECONDS;
				currentScene = "new-bark";
				visualStage.dataset.scene = currentScene;
			}

			visualStage.style.setProperty("--breakout-progress", String(progress));
			visualStage.style.setProperty("--stage-inset-top", `${insets.top}px`);
			visualStage.style.setProperty("--stage-inset-right", `${insets.right}px`);
			visualStage.style.setProperty(
				"--stage-inset-bottom",
				`${insets.bottom}px`,
			);
			visualStage.style.setProperty("--stage-inset-left", `${insets.left}px`);
		}

		function scheduleLayoutUpdate() {
			layoutRequested = true;
			if (frameRequest === 0) {
				frameRequest = globalThis.requestAnimationFrame(runFrame);
			}
		}

		function runFrame(timestamp) {
			frameRequest = 0;

			if (layoutRequested) {
				layoutRequested = false;
				updateLayout();
			}

			updateReel(timestamp);
			frameRequest = globalThis.requestAnimationFrame(runFrame);
		}

		updateLayout();
		globalThis.addEventListener("scroll", scheduleLayoutUpdate, {
			passive: true,
		});
		globalThis.addEventListener("resize", scheduleLayoutUpdate);
		document.addEventListener("visibilitychange", () => {
			lastTimestamp = 0;
		});
		frameRequest = globalThis.requestAnimationFrame(runFrame);
	}
}
