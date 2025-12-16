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
    <footer class="py-4 px-6 border-t border-amber-900/30">
      <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-slate-500 text-sm">
          Powered by <span class="text-amber-400">Grok AI</span> | You play White
        </p>
        <!-- Ko-fi Support Button -->
        <a
          href="https://ko-fi.com/dizid"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5E5B] hover:bg-[#ff4442] text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-red-900/20"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
          </svg>
          Support this project
        </a>
      </div>
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
