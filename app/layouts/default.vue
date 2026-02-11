<script setup lang="ts">
const appConfig = useAppConfig()
const route = useRoute()

type LayoutMode = 'default' | 'fixed' | 'hidden'

const layoutMode = computed<LayoutMode>(() => {
  const routeMode = route.meta?.layoutMode as LayoutMode | undefined
  const configMode = appConfig.layoutMode as LayoutMode | undefined
  return routeMode || configMode || 'default'
})

const isFixed = computed(() => layoutMode.value === 'fixed')
const isHidden = computed(() => layoutMode.value === 'hidden')
</script>

<template>
  <div
    class="layout"
    :class="{ 'layout--fixed': isFixed, 'layout--hidden': isHidden }"
  >
    <AppHeader v-if="!isHidden" :fixed="isFixed" />
    <main class="layout__main">
      <slot />
    </main>
    <AppFooter v-if="!isHidden" :fixed="isFixed" />
  </div>
</template>

<style scoped>
.layout {
  --header-h: 56px;
  --footer-h: 50px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout__main {
  flex: 1;
  padding: 0px 1%;
}

.layout--fixed .layout__main {
  padding-top: var(--header-h);
  padding-bottom: var(--footer-h);
}
</style>
