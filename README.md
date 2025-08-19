<center>
<img src='assets/logo.png' alt='EduBuddy' width='200'/>
</center>

# EduBuddy-儿童教育智能体

:blush: Tap, Play, Learn the EduBuddy Way!

:revolving_hearts: 让父母的陪伴不再受时空限制，让孩子的教育从此千人千面

:sparkles: 中关村黑客松项目第三名

## Demo

https://github.com/user-attachments/assets/c495ab35-5c02-46b1-96ae-c7b876fed898

## 作品介绍
<img src='assets/intro.png' alt='EduBuddy' width='100%'/>

## 实现思路
<img src='assets/tech.png' alt='整体架构' width='100%'/>

- 基于`vue3`的前端界面
- 基于`Chatgpt-4.1`模型搭建故事生成Agent
- 基于`Coze`平台搭建图像+音频生成Agent

<img src='assets/tech1.jpg' alt='Coze工作流' width='100%'/>

## How To Use?
1. 克隆本仓库至本地
2. 导入工作流到 COZE
   - 下载本仓库中的安装包 **Workflow-EduBuddy-draft-9115.zip**  
   - 登录 [COZE 平台](https://www.coze.cn)  
   - 进入目标工作空间，在「工作流」页面点击 **导入**  
   - 选择下载好的 **Workflow-EduBuddy-draft-9115.zip** 文件并上传  
   - 上传完成后，即可在工作空间中看到 **EduBuddy** 工作流，打开后发布即可使用
3. 安装必要的依赖
    ```bash
    cd EduBuddy
    npm install
    ```
4. 替换以下文件中的 `accesstoken`

   - **`src\config.js line6`**  
     替换为你自己的 **基座大模型 API Key**。

   - **`src\api\index.js line107`**  
     替换为 COZE 平台中 **EduBuddy 工作流的 `workflow_id`**。  
     👉 获取方式：参考 [COZE 官方文档](https://www.coze.cn/open/docs/developer_guides/workflow_run)，在调用接口时，Header 授权后，Body params 中的 `workflow_id` 会显示 EduBuddy 工作流 ID，将其填入这里。

   - **`src\api\index.js line112`**  
     替换为你的 **COZE 授权 Token**。注意这里必须带上 `Bearer ` 前缀，格式如下：  
     ```http
     Authorization: Bearer <your_token>
     ```

   ⚠️ 注意：不要遗漏 `Bearer`，否则会报 401 Unauthorized。

5. 运行项目
    ```bash
    npm run dev
    ```

---
由于开发时间有限，采用各种敏捷开发工具也仅仅实现出我们想法的一部分~ 

项目海报和前端页面的部分素材使用AI生成~ 

欢迎大家Star~
