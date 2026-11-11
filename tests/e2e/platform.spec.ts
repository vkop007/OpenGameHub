import { test, expect } from "@playwright/test";

test.describe("OpenGameHub E2E Browser Suite", () => {
  test("Homepage loads featured games, search & filter controls, and contribution CTA", async ({
    page
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(page.getByTestId("hero-heading")).toBeVisible();
    await expect(page.getByTestId("game-card-space-shooter")).toBeVisible();
    await expect(page.getByTestId("game-card-neon-breakout")).toBeVisible();
    await expect(page.getByTestId("game-card-dungeon-crawler")).toBeVisible();
    await expect(page.getByTestId("game-card-cyber-2048")).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("Game Library search, category filters, engine filters, and empty state work", async ({
    page
  }) => {
    await page.goto("/games");
    await expect(page.getByTestId("library-heading")).toBeVisible();

    const searchInput = page.getByTestId("game-search-input");
    await searchInput.fill("Space Shooter");
    await expect(page.getByTestId("game-card-space-shooter")).toBeVisible();
    await expect(page.getByTestId("game-card-neon-breakout")).toHaveCount(0);

    await searchInput.fill("non-existent-xyz-game");
    await expect(page.getByTestId("empty-results-state")).toBeVisible();

    await page.getByTestId("reset-filters-button").click();
    await expect(page.getByTestId("game-card-neon-breakout")).toBeVisible();
  });

  test("Game Details and Sandboxed Universal Game Player work with restart & fullscreen controls", async ({
    page
  }) => {
    await page.goto("/games/space-shooter");
    await expect(page.getByTestId("detail-game-title")).toHaveText("Space Shooter 3D");
    await expect(page.getByTestId("detail-game-engine")).toContainText("Three.js");

    await page.getByTestId("detail-play-button").click();
    await expect(page).toHaveURL(/\/play\/space-shooter/);

    const iframe = page.getByTestId("game-iframe");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-pointer-lock"
    );
    await expect(iframe).toHaveAttribute(
      "src",
      "/_games/space-shooter/1.0.0/index.html"
    );

    await page.getByTestId("player-restart-button").click();
    await expect(iframe).toBeVisible();
    await expect(page.getByTestId("player-fullscreen-button")).toBeVisible();
  });

  test("Missing / invalid game routes render 404 Not Found state cleanly", async ({
    page
  }) => {
    const response = await page.goto("/games/non-existent-game-slug");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("not-found-heading")).toBeVisible();
  });
});
