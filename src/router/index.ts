import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/add',
      name: 'add',
      component: () => import('../views/AddStockView.vue'),
    },
    {
      path: '/edit/:id',
      name: 'edit',
      component: () => import('../views/AddStockView.vue'),
    },
    {
      path: '/stock/:id',
      name: 'stock-detail',
      component: () => import('../views/StockDetailView.vue'),
    },
  ],
})

export default router
