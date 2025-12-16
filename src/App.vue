<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
    <!-- Header -->
    <header class="py-4 px-6 border-b border-amber-900/30">
      <div class="max-w-6xl mx-auto flex items-center justify-center gap-3">
        <span class="text-3xl">♚</span>
        <h1 class="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
          Chess vs Grok AI
        </h1>
        <span class="text-3xl">♔</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex items-center justify-center p-4 md:p-8">
      <ChessBoard />
    </main>

    <!-- Ad Banner -->
    <div class="w-full max-w-4xl mx-auto px-4 py-2">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-2222840120415329"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>

    <!-- Footer -->
    <footer class="py-3 px-6 border-t border-amber-900/30 text-center">
      <p class="text-slate-500 text-sm">
        Powered by <span class="text-amber-400">Grok AI</span> | You play White
      </p>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import ChessBoard from './components/chess-board.vue'

// Initialize Google AdSense ad when component mounts
onMounted(() => {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({})
  } catch (e) {
    // AdSense not loaded yet or ad blocked
  }
})
</script>
