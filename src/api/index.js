import axios from 'axios'
import { config } from '../config'

// OpenAI API调用实例（直接调用API，仅用于测试环境）
const openaiApi = axios.create({
    baseURL: config.api.openai.baseUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api.openai.apiKey}`
    }
})

// API接口
export const appApi = {
    // 调用大模型生成剧情文本
    generateStory(promptText) {
        // 构建系统提示和用户提示
        const systemPrompt = `你是一个儿童教育互动剧情生成器。基于用户提供的主题，你需要创建一个引人入胜的、适合儿童的情景剧本，并提供3个不同的选择让用户决定如何推进剧情。若涉及历史内容，请尊重历史事实，切勿扭曲。
        返回格式必须是有效的JSON，包含以下字段：
        {
        "story": "剧情文本描述...",
        "options": ["选项1", "选项2", "选项3"],
        "imagePrompt": "用于生成场景图片的详细描述..."
        }`;

        const userPrompt = `基于以下主题创建一个适合儿童的互动教育剧情场景：${promptText}。
        请确保剧情有道德启发性、富有教育意义，并包含一个适合儿童理解的情境。
        提供3个不同的选择，代表不同的行动方向。
        只返回JSON格式，不要有其他解释文本。`;

        return openaiApi.post('/chat/completions', {
            model: config.api.openai.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7
        }).then(response => {
            // 从OpenAI响应中提取内容并解析JSON
            const content = response.data.choices[0].message.content;
            try {
                // 尝试解析返回的JSON
                return JSON.parse(content);
            } catch (error) {
                // 如果无法解析，尝试从文本中提取故事和选项
                console.error("无法解析API返回的JSON，尝试从文本中提取", error);

                // 创建一个基本的结果对象
                const fallbackResult = {
                    story: content,
                    options: ["继续故事", "选择不同的路径", "重新开始"],
                    imagePrompt: "儿童教育场景插图"
                };

                return fallbackResult;
            }
        });
    },

    // 继续生成剧情
    continueStory(storyText, selectedOption) {
        const systemPrompt = `你是一个儿童教育互动剧情生成器。基于已有的故事和用户的选择，你需要继续发展故事情节，并提供3个新的选择让用户决定如何继续。
        返回格式必须是有效的JSON，包含以下字段：
        {
        "story": "新的剧情发展...",
        "options": ["选项1", "选项2", "选项3"],
        "imagePrompt": "用于生成场景图片的详细描述..."
        }`;

        const userPrompt = `已有的故事：${storyText}\n\n用户选择了：${selectedOption}\n\n请基于这个选择继续发展故事，确保保持教育意义，并提供新的选项。
        只返回JSON格式，不要有其他解释文本。`;

        return openaiApi.post('/chat/completions', {
            model: config.api.openai.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7
        }).then(response => {
            const content = response.data.choices[0].message.content;
            try {
                return JSON.parse(content);
            } catch (error) {
                console.error("无法解析API返回的JSON，尝试从文本中提取", error);

                const fallbackResult = {
                    story: content,
                    options: ["继续故事", "选择不同的路径", "重新开始"],
                    imagePrompt: "儿童教育场景插图"
                };

                return fallbackResult;
            }
        });
    },

    // 生成情景图片（使用 CozeAPI）
    async generateImage(imagePrompt) {
        // return axios.post('https://api.coze.cn/v1/workflow/run', { prompt: imagePrompt })

        try {
            const response = await axios.post(
                'https://api.coze.cn/v1/workflow/run',
                {
                    workflow_id: 'Your Coze workflow id here',
                    parameters: { input: imagePrompt },
                },
                {
                    headers: {
                        Authorization: 'Your Coze API token here',
                    },
                }
            );
            console.log('服务器返回:', response.data);
            return response.data;
        } catch (error) {
            console.error('出错了:', error);
            throw error;
        }
    }
}

export default openaiApi 