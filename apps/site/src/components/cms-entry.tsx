if (import.meta.env.DEV) {
  await import("./cms-preamble");
}

const { mountCmsApp } = await import("./cms-mount");

try {
  mountCmsApp("cms-root");
} catch (error) {
  console.error(error);
  const root = document.getElementById("cms-root");
  if (root) {
    root.innerHTML =
      '<p class="dashboard-error">Failed to load the CMS. Check the browser console for details.</p>';
  }
}
