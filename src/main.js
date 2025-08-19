import { createApp } from 'vue'
import axios from 'axios'
import './style.css'
import App from './App.vue'

const app = createApp(App)

// 创建 axios 实例
const api = axios.create({
    // 设置基础URL，可以根据环境变量或配置来决定
    baseURL: 'http://localhost:3000/api',
    timeout: 10000, // 请求超时时间
    headers: {
        'Content-Type': 'application/json'
    }
})

// 添加请求拦截器
api.interceptors.request.use(
    config => {
        // 可以在这里添加认证信息等
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 添加响应拦截器
api.interceptors.response.use(
    response => {
        return response.data
    },
    error => {
        // 统一处理错误
        console.error('请求错误:', error)
        return Promise.reject(error)
    }
)

// 将 axios 实例添加到全局属性
app.config.globalProperties.$axios = api

app.mount('#app')
