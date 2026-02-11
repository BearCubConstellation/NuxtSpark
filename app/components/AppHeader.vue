<script setup lang="ts">
const appConfig = useAppConfig()
const router = useRouter()

defineProps<{ fixed?: boolean }>()

const navItems = computed(() =>
  router
    .getRoutes()
    .filter(
      (route) =>
        route.meta?.nav === true && !route.path.includes(':')
    )
    .sort((a, b) => (Number(a.meta?.order) || 0) - (Number(b.meta?.order) || 0))
    .map((route) => ({
      path: route.path,
      title: String(route.meta?.title || route.name || route.path),
    }))
)
</script>

<template>
  <header class="app-header" :class="{ 'app-header--fixed': fixed }">
    <div class="app-header__inner">
      <span class="app-header__title">
        <img class="app-header__icon" src="/favicon.ico" alt="" draggable="false" />
        {{ appConfig.appName }}
      </span>
      <nav class="app-header__nav">
        <NuxtLink v-for="item in navItems" :key="item.path" :to="item.path">
          {{ item.title }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  border-bottom: 1px solid #e6e6e6;
  background: #fafafa;
}

.app-header--fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-h);
  z-index: 1000;
}

.app-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px;
}

.app-header--fixed .app-header__inner {
  height: 100%;
  padding: 0 20px;
}

.app-header__title {
  box-sizing: border-box;
  /* border: 1px solid red; */
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.app-header__icon {
  width: 16px;
  height: 16px;
  display: block;
  user-select: none;
  pointer-events: none;
}

.app-header__nav {
  box-sizing: border-box;
  /* border: 1px solid blue; */
  display: flex;
  gap: 12px;
}
</style>
