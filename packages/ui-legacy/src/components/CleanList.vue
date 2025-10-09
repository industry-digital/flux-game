<template>
  <ul class="clean-list">
    <li v-for="(item, index) in items" :key="index" class="clean-list-item">
      <slot :item="item" :index="index">
        {{ item }}
      </slot>
    </li>
  </ul>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
.clean-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.clean-list-item {
  margin: 0;
  padding: 0;
}
</style>
