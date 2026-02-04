<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <footer class="app-footer">
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

.app-footer__inner {
  /* border:1px solid red; */
  text-align: center;
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px;
  color: #666;
  font-size: 14px;
}
.app-footer__link {
 color: inherit;
 text-decoration: none;
}
.app-footer__link:hover {
 text-decoration: underline;
}
</style>
