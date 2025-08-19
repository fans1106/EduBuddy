export const config = {
    // API 配置
    api: {
        // OpenAI API 配置
        openai: {
            apiKey: 'Your OpenAI API Key', // 这里直接写入API密钥（示例密钥）
            baseUrl: 'https://api.openai-proxy.org/v1',
            model: 'gpt-4.1', // 可替换为其他模型
        }
    },
    // 应用设置
    app: {
        // 是否使用模拟数据（当API调用失败时）
        useDemoData: false,
        // 是否启用图片生成功能
        enableImageGeneration: true
    }
}