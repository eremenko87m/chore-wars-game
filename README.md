# Chore Wars — GitHub Pages version 2

This version is intentionally robust for GitHub Pages:
- all CSS and JavaScript are inside `index.html`;
- only the `assets` folder is external;
- all visible controls are real HTML buttons;
- Mission 5 contains three animated spinning wheels (WHO / CHORE / WHEN);
- no server, framework, npm, or build step is required.

## Upload to GitHub
1. Open your existing `chore-wars` repository.
2. Delete/replace the old files.
3. Upload **index.html**, **.nojekyll**, and the whole **assets** folder from this package.
4. Keep `index.html` in the repository root.
5. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
6. Open the GitHub Pages URL and hard refresh the browser (Ctrl+F5 on Windows).

If the old version is cached, add `?v=2` to the end of your Pages URL once.
