import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue';
import vuetify, {transformAssetUrls} from 'vite-plugin-vuetify';
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { VitePWA } from 'vite-plugin-pwa'

// TODO: Replace this with variants of the .env file.
if (import.meta.env.CIRCLE_BRANCH) {
  if (import.meta.env.CIRCLE_BRANCH === 'staging') {
    import.meta.env.VUE_APP_BASE_URL = 'https://nbhdcompassstage.azurewebsites.us';
  } else if (import.meta.env.CIRCLE_BRANCH === 'develop') {
    import.meta.env.VUE_APP_BASE_URL = 'https://nbhdcompassdev.azurewebsites.us';
  } else {
    import.meta.env.VUE_APP_BASE_URL = 'https://compass.durhamnc.gov';
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    vuetify({ autoImport: true, styles: { configFile: 'src/scss/vuetify-settings.scss'} }),
    VueI18nPlugin({
      include: [resolve(dirname(fileURLToPath(import.meta.url)), './src/locales/*.json'),resolve(dirname(fileURLToPath(import.meta.url)), './data/locales/*.json')]
    }),
    VitePWA({ registerType: 'autoUpdate' }),
  ],
  ssr: {
    noExternal: ['vuetify', /vue-i18n/],
  },
  ssgOptions: {
    crittersOptions: {
      // E.g., change the preload strategy
      preload: "media",
      // Other options: https://github.com/GoogleChromeLabs/critters#usage
    },
  },
  resolve: {
    alias: {
      "@": resolve(dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
})
