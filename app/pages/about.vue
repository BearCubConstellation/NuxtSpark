<script setup lang="ts">
definePageMeta({
 title: '关于',
 nav: true,
 order: 2,
 layoutMode: 'fixed',
})
</script>

<style scoped>
#test-content {
    background-color: #f0f0f0;
    padding: 20px;
    border-radius: 5px;
    text-align: center;
    border: 1px solid black;
    cursor: pointer;
    height: 2000px;
}
</style>

<template>
    <div>
        <h1>欢迎来到About</h1>
    </div>
    <div id="test-content">
        <p>这是一个关于页面的示例。</p>
    </div>
</template>
