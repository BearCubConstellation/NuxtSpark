<script setup lang="ts">
const appConfig = useAppConfig()

defineProps<{ fixed?: boolean }>()
</script>

<template>
  <footer class="app-footer" :class="{ 'app-footer--fixed': fixed }">
    <div class="app-footer__inner">
      <span>© 2026 <a class="app-footer__link" href="https://cymrise.cn/" target="_blank">{{ appConfig.appName }}</a></span>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid #e6e6e6;
  background: #fafafa;
}

.app-footer--fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--footer-h);
  z-index: 1000;
}

.app-footer__inner {
  /* border:1px solid red; */
  text-align: center;
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px;
  color: #666;
  font-size: 14px;
}

.app-footer--fixed .app-footer__inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
}

.app-footer__link {
  color: inherit;
  text-decoration: none;
}

.app-footer__link:hover {
  text-decoration: underline;
}
</style>
