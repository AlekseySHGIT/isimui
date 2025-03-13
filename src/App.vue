<template>
  <v-app>
    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script setup>
// The router-view component will render the appropriate component based on the current route
</script>

<style>
.v-application {
  font-family: 'Roboto', sans-serif;
}

/* Global styles for consistent look and feel */
.v-card {
  border-radius: 8px;
  transition: box-shadow 0.3s ease, transform 0.2s ease;
}

.v-btn {
  text-transform: none;
  letter-spacing: 0.5px;
}

.v-data-table {
  border-radius: 8px;
  overflow: hidden;
}

/* Custom scrollbar for a more polished look */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
