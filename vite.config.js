import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/",

  build: {
    outDir: "../dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        pantry: resolve(__dirname, "src/pantry/index.html"),
        get_recipes: resolve(__dirname, "src/pantry/get_recipes.html"),
        recipe_detail: resolve(__dirname, "src/recipe_detail/index.html"),
        shopping_list: resolve(__dirname, "src/shopping_list/index.html"),
        recipe_search: resolve(__dirname, "src/recipes/index.html"),
        saved_recipes: resolve(__dirname, "src//saved_recipes/index.html"),
        meal_planner: resolve(__dirname, "src//meal_planner/index.html"),
      },
    },
  },
});
