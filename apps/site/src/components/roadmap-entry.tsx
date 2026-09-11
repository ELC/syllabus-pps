if (import.meta.env.DEV) {
  await import("./cms-preamble");
}

const { mountRoadmapApp } = await import("./roadmap-mount");

const root = document.getElementById("roadmap-root");
if (!root) {
  throw new Error("Missing roadmap container #roadmap-root");
}

const dataUrl = root.dataset.curriculumUrl;

try {
  mountRoadmapApp("roadmap-root", dataUrl);
} catch (error) {
  console.error(error);
  root.textContent = "Failed to load roadmap. Check the browser console for details.";
}
