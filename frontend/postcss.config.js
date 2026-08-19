// Tailwind CSS v4 ships its own PostCSS plugin, which also handles vendor
// prefixing — autoprefixer is no longer needed. The theme/config now lives in
// src/index.css, so nothing is passed in here.
import tailwindcss from '@tailwindcss/postcss'

export default {
  plugins: [tailwindcss()],
}
