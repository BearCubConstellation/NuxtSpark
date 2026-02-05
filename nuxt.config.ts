// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  fonts: {
    provider: 'local',
  },
  app: {
    head: {
      title: 'Cymrise NuxtSpark',
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  runtimeConfig: {
    public: {
      amapKey: process.env.NUXT_PUBLIC_AMAP_KEY,
      baiduMapAk: process.env.NUXT_PUBLIC_BAIDU_MAP_AK,
      tencentMapKey: process.env.NUXT_PUBLIC_TENCENT_MAP_KEY,
    },
  },
})
