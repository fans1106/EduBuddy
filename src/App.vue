<script setup>
import { ref, getCurrentInstance, nextTick, watch } from 'vue'
import { appApi } from './api/index.js'
import { config } from './config.js'
import foxImage from './assets/images/fox.png'

// 获取 Vue 实例，以访问全局属性
const { proxy } = getCurrentInstance()

// 用于存储 prompt 输入内容
const promptText = ref('')

// 用于标记是否加载中
const isLoading = ref(false)
const isStoryLoading = ref(false)
const isImageLoading = ref(false)

// 错误和成功信息
const errorMsg = ref('')
const successMsg = ref('')

// 剧情状态
const currentStoryText = ref('')  // 当前剧情文本
const currentStoryOptions = ref([])  // 当前可选项
const currentImagePrompt = ref('') // 当前图像提示词
const currentImageUrl = ref('') // 当前图像URL

// 用户选择的选项
const selectedOption = ref('')  // 当前选择的选项

// 当前步骤：1-输入prompt，2-互动剧情
const currentStep = ref(1)

// 历史记录，记录每一步的剧情
const storyHistory = ref([])

// 为了演示目的，添加一些示例故事
const demoStories = [
  {
    story: "小明在学校的操场上发现了一个丢失的钱包。钱包里有100元钱和失主的学生证。小明应该怎么做？",
    options: ["把钱包交给老师", "把钱拿走，把钱包丢掉", "找到失主归还钱包"],
    imagePrompt: "一个小学生在操场上捡到钱包，钱包里有钱和证件"
  },
  {
    story: "小红看到同学小华考试时偷看答案。小红应该怎么做？",
    options: ["告诉老师小华作弊", "悄悄提醒小华不要作弊", "装作没看见"],
    imagePrompt: "教室里，一个小女孩看到另一个同学在考试中偷看答案"
  },
  {
    story: "小李的朋友邀请他一起去看一部家长不允许他们观看的电影。小李该怎么做？",
    options: ["拒绝邀请，遵守家长的规定", "偷偷去看电影不告诉家长", "和家长商量是否可以去看"],
    imagePrompt: "一个孩子站在电影院门口，显得很犹豫，朋友在旁边催促他"
  }
]

// 新增：当前图片数组
const currentImageUrls = ref([])
// 新增：当前显示的图片索引
const currentImageIndex = ref(0)
// 新增：当前音频数组
const currentAudioUrls = ref([])
// 新增：audio 元素引用
const audioRef = ref(null)

// 显示消息
const showMessage = (message, isError = false) => {
  if (isError) {
    errorMsg.value = message
    setTimeout(() => {
      errorMsg.value = ''
    }, 5000)
  } else {
    successMsg.value = message
    setTimeout(() => {
      successMsg.value = ''
    }, 3000)
  }
}

// 生成场景图片和音频
const jiexi = (data) => {
  const dataStr = data.data;
  const dataObj = JSON.parse(dataStr);
  return [dataObj.images, dataObj.audio]
}

// 步骤1：调用大模型API生成剧情文本和图片
const generateStory = async () => {
  if (!promptText.value.trim()) {
    showMessage('请输入主题提示词', true)
    return
  }

  isStoryLoading.value = true
  currentImageUrl.value = '' // 清空之前的图片

  try {
    // 调用API生成剧情文本和选项
    const response = await appApi.generateStory(promptText.value)
    if (response && response.story && response.options) {
      currentStoryText.value = response.story
      currentStoryOptions.value = response.options
      currentImagePrompt.value = response.imagePrompt || response.story

      // 生成图片和音频
      console.log(currentStoryText.value)
      const data = await appApi.generateImage(currentStoryText.value)
      const [images, audio] = jiexi(data)
      currentImageUrls.value = images || []
      currentAudioUrls.value = audio || []
      currentImageIndex.value = 0
      currentImageUrl.value = images && images.length > 0 ? images[0] : ''
      // 自动播放音频
      nextTick(() => {
        if (audioRef.value) audioRef.value.play()
      })

      // 记录到历史
      storyHistory.value.push({
        story: response.story,
        options: response.options,
        imagePrompt: response.imagePrompt,
        imageUrl: currentImageUrl.value
      })

      currentStep.value = 2
      showMessage('剧情生成成功！请选择下一步行动')
    } else {
      throw new Error('获取剧情失败，服务器返回数据格式不正确')
    }
  } catch (error) {
    console.error('生成剧情失败:', error)
    showMessage(`生成剧情失败: ${error.message || '未知错误'}`, true)
    if (config.app.useDemoData) {
      handleDemoMode()
    }
  } finally {
    isStoryLoading.value = false
  }
}

// 切换图片时自动播放音频
watch(currentImageIndex, (newIdx) => {
  if (currentAudioUrls.value && currentAudioUrls.value[newIdx] && audioRef.value) {
    audioRef.value.currentTime = 0
    audioRef.value.play()
  }
})

const onAudioEnded = () => {
  // 如果还有下一张图片，就切换到下一张并自动播放
  if (currentImageIndex.value < currentImageUrls.value.length - 1) {
    currentImageIndex.value += 1
    // nextTick 自动播放音频
    nextTick(() => {
      if (audioRef.value) audioRef.value.play()
    })
  }
  // 如果已经到最后一张，则什么都不做，不循环
}


// 选择一个选项，推进故事
const selectOption = async (option, index) => {
  if (isLoading.value) return

  isLoading.value = true
  selectedOption.value = option
  currentImageUrl.value = '' // 清空当前图片，准备加载新图片

  try {
    // 调用API继续生成剧情
    const response = await appApi.continueStory(currentStoryText.value, option)

    if (response && response.story && response.options) {
      // 更新剧情和选项
      currentStoryText.value = response.story
      currentStoryOptions.value = response.options
      currentImagePrompt.value = response.imagePrompt || response.story
      // 生成新场景图片和音频
      console.log(currentStoryText.value)

      const data = await appApi.generateImage(currentStoryText.value)

      // const data = { "code": 0, "cost": "0", "data": "{\"audio\":[\"https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7468512265151463451_f457a0dd-25b0-4413-9fa9-c1f61839b41c.mp3?lk3s=da27ec82&x-expires=1752816564&x-signature=1aX3tRMW0kd%2BkGb%2F2u%2BvkA%2BvVpk%3D\",\"https://lf9-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7468512265151463451_b66b3ad1-1cd9-4295-9abf-86e2cdc36838.mp3?lk3s=da27ec82&x-expires=1752816564&x-signature=jijbLiRkmggYNkxx7WW6brmtJis%3D\"],\"images\":[\"https://s.coze.cn/t/Gw1GWmDPBTw/\",\"https://s.coze.cn/t/WYA7fks_-hA/\"]}", "debug_url": "https://www.coze.cn/work_flow?execute_id=7527176539429142568&space_id=7500030390309011475&workflow_id=7527125469075996715&execute_mode=2", "msg": "Success", "token": 576 }
      const [images, audio] = jiexi(data)
      currentImageUrls.value = images || []
      currentAudioUrls.value = audio || []
      currentImageIndex.value = 0
      currentImageUrl.value = images && images.length > 0 ? images[0] : ''
      nextTick(() => {
        if (audioRef.value) audioRef.value.play()
      })
      storyHistory.value.push({
        story: response.story,
        options: response.options,
        imagePrompt: response.imagePrompt,
        imageUrl: currentImageUrl.value,
        previousChoice: option
      })
      showMessage('故事已推进到新场景')
    } else {
      throw new Error('继续故事失败，服务器返回数据格式不正确')
    }
  } catch (error) {
    console.error('推进故事失败:', error)
    showMessage(`推进故事失败: ${error.message || '未知错误'}`, true)

    // 演示模式：使用模拟数据
    if (config.app.useDemoData) {
      handleDemoSelectionMode(option, index)
    }
  } finally {
    isLoading.value = false
  }
}

// 返回上一步
const goBack = () => {
  // 如果历史记录至少有两条（当前和上一步）
  if (storyHistory.value.length > 1) {
    // 移除最后一条记录
    storyHistory.value.pop()

    // 获取上一步记录
    const previousStep = storyHistory.value[storyHistory.value.length - 1]

    // 恢复上一步的状态
    currentStoryText.value = previousStep.story
    currentStoryOptions.value = previousStep.options
    currentImagePrompt.value = previousStep.imagePrompt
    currentImageUrl.value = previousStep.imageUrl

    showMessage('返回上一步')
  } else {
    showMessage('已经是第一步，无法返回', true)
  }
}

// 重新开始
const restart = () => {
  currentStep.value = 1
  promptText.value = ''
  currentStoryText.value = ''
  currentStoryOptions.value = []
  currentImagePrompt.value = ''
  currentImageUrl.value = ''
  selectedOption.value = ''
  storyHistory.value = []
}

// 演示模式：使用模拟数据
const handleDemoMode = async () => {
  if (config.app.useDemoData) {
    // 随机选择一个示例故事
    const randomIndex = Math.floor(Math.random() * demoStories.length)
    const demoStory = demoStories[randomIndex]

    currentStoryText.value = demoStory.story
    currentStoryOptions.value = demoStory.options
    currentImagePrompt.value = demoStory.imagePrompt

    // 生成图片（如果启用）或使用占位图片
    const imageUrls = config.app.enableImageGeneration ?
      await appApi.generateImage(demoStory.imagePrompt) :
      ['/images/placeholder-image.jpg']
    currentImageUrls.value = imageUrls
    currentImageIndex.value = 0
    currentImageUrl.value = imageUrls[0]

    // 生成音频（如果启用）或使用占位音频
    const audioUrls = config.app.enableAudioGeneration ?
      await appApi.generateAudio(demoStory.imagePrompt) : // 假设音频提示词与图片提示词相关
      ['/audio/placeholder-audio.mp3'] // 无音频时使用占位音频
    currentAudioUrls.value = audioUrls
    // 自动播放音频
    nextTick(() => {
      if (audioRef.value) audioRef.value.play()
    })

    // 记录到历史
    storyHistory.value.push({
      story: demoStory.story,
      options: demoStory.options,
      imagePrompt: demoStory.imagePrompt,
      imageUrl: currentImageUrl.value
    })

    // 进入第二步
    currentStep.value = 2
    showMessage('使用演示数据（API调用失败）')
  }
}

// 演示模式：处理选择
const handleDemoSelectionMode = async (option, index) => {
  if (config.app.useDemoData) {
    // 生成一个简单的后续故事
    const continueStory = `你选择了"${option}"。根据你的选择，故事继续发展...`
    const newOptions = ["继续探索", "寻求帮助", "重新开始"]
    const imagePrompt = `儿童插图，表现了选择${option}后的场景`

    currentStoryText.value = continueStory
    currentStoryOptions.value = newOptions
    currentImagePrompt.value = imagePrompt

    // 生成图片（如果启用）或使用占位图片
    const imageUrls = config.app.enableImageGeneration ?
      await appApi.generateImage(imagePrompt) :
      ['/images/placeholder-image.jpg']
    currentImageUrls.value = imageUrls
    currentImageIndex.value = 0
    currentImageUrl.value = imageUrls[0]

    // 生成音频（如果启用）或使用占位音频
    const audioUrls = config.app.enableAudioGeneration ?
      await appApi.generateAudio(imagePrompt) : // 假设音频提示词与图片提示词相关
      ['/audio/placeholder-audio.mp3'] // 无音频时使用占位音频
    currentAudioUrls.value = audioUrls
    // 自动播放音频
    nextTick(() => {
      if (audioRef.value) audioRef.value.play()
    })

    // 记录到历史
    storyHistory.value.push({
      story: continueStory,
      options: newOptions,
      imagePrompt: imagePrompt,
      imageUrl: currentImageUrl.value,
      previousChoice: option
    })

    showMessage('使用演示数据（API调用失败）')
  }
}

// 保存学习历程
const saveStory = () => {
  try {
    const storyData = {
      theme: promptText.value,
      history: storyHistory.value,
      timestamp: new Date().toISOString()
    }

    // 将历史保存到本地存储
    const savedStories = JSON.parse(localStorage.getItem('educationStories') || '[]')
    savedStories.push(storyData)
    localStorage.setItem('educationStories', JSON.stringify(savedStories))

    showMessage('学习历程已保存！')
    restart()
  } catch (error) {
    console.error('保存历史失败:', error)
    showMessage('保存失败，请稍后重试', true)
  }
}
</script>

<template>
  <div class="app-container">
    <div class="content-container">
      <div class="header-section">
        <h1>EduBuddy</h1>
        <p class="slogan">Tap, Play, Learn the EduBuddy Way!</p>
      </div>

      <!-- 错误和成功提示 -->
      <div v-if="errorMsg" class="message error-message">
        <span>{{ errorMsg }}</span>
        <button @click="errorMsg = ''" class="close-btn">&times;</button>
      </div>

      <div v-if="successMsg" class="message success-message">
        <span>{{ successMsg }}</span>
        <button @click="successMsg = ''" class="close-btn">&times;</button>
      </div>

      <!-- 步骤1：输入主题提示 -->
      <div v-if="currentStep === 1" class="start-container">
        <!-- <div class="fox-mascot">
          <img :src="foxImage" alt="小狐狸吉祥物" />
        </div> -->

        <div class="prompt-section">
          <h2>输入情景主题：</h2>
          <textarea id="prompt-input" v-model="promptText" placeholder="请输入教育情景主题，如'诚实守信'、'尊老爱幼'、'环保意识'等..."
            rows="4"></textarea>
        </div>

        <div class="button-group center">
          <button @click="generateStory" :disabled="isStoryLoading" class="primary-button">
            <span class="star-icon">✨</span>
            <span v-if="isStoryLoading">生成中...</span>
            <span v-else>创建情景故事</span>
          </button>
        </div>

        <p class="hint-text">* 点击按钮，体验不一样的学习之旅~</p>
      </div>

      <!-- 步骤2：互动情景 -->
      <div v-if="currentStep === 2" class="story-container">
        <!-- 左侧：剧情文本 -->
        <div class="story-column">
          <div class="story-box">
            <h2>当前情景：</h2>
            <div class="story-text">{{ currentStoryText }}</div>

            <div class="button-group">
              <button @click="restart" class="secondary-button">重新开始</button>
              <button @click="goBack" class="secondary-button" :disabled="storyHistory.length <= 1">返回上一步</button>
              <button @click="saveStory" class="secondary-button">保存学习历程</button>
            </div>
          </div>
        </div>

        <!-- 右侧：图片和选项按钮 -->
        <div class="image-column">
          <div class="image-section">
            <!-- 图片显示 -->
            <div class="image-container">
              <div v-if="isLoading || isStoryLoading || isImageLoading" class="loading-overlay">
                <div class="loading-spinner"></div>
                <p>场景生成中，请稍候...</p>
              </div>
              <template v-if="currentImageUrls.length > 0">
                <img :src="currentImageUrls[currentImageIndex]" alt="场景插图" class="story-image" />
                <audio v-if="currentAudioUrls.length > 0 && currentAudioUrls[currentImageIndex]" ref="audioRef"
                  :src="currentAudioUrls[currentImageIndex]" @ended="onAudioEnded" autoplay
                  style="display:none"></audio>
                <!-- 移除手动切换图片按钮 -->
                <!-- <div v-if="currentImageUrls.length > 1" class="image-switcher">
                  <button
                    @click="currentImageIndex = (currentImageIndex - 1 + currentImageUrls.length) % currentImageUrls.length"
                    :disabled="isLoading || isStoryLoading || isImageLoading">上一张</button>
                  <span>{{ currentImageIndex + 1 }} / {{ currentImageUrls.length }}</span>
                  <button @click="currentImageIndex = (currentImageIndex + 1) % currentImageUrls.length"
                    :disabled="isLoading || isStoryLoading || isImageLoading">下一张</button>
                </div> -->
              </template>
              <div v-else class="placeholder-image">
                <p>场景图片生成中...</p>
              </div>
            </div>

            <!-- 剧情选择按钮 -->
            <div class="option-section">
              <!-- 选项按钮 -->
              <div v-if="currentStoryOptions.length > 0" class="options-container">
                <h3>你会怎么做？</h3>
                <div class="option-buttons">
                  <button v-for="(option, index) in currentStoryOptions" :key="index"
                    @click="selectOption(option, index)" :disabled="isLoading || isStoryLoading || isImageLoading"
                    class="option-button" :class="{ 'selected': selectedOption === option }">
                    {{ option }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部小狐狸装饰 -->
    <div class="footer-decoration">
      <img :src="foxImage" alt="小狐狸" class="footer-fox" />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(120deg, #c9f5d2 0%, #f7f9c2 100%);
  padding: 20px;
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  position: relative;
  overflow: hidden;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}

.header-section {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  font-size: 2.5rem;
  color: #2b4255;
  margin-bottom: 10px;
  font-weight: bold;
  letter-spacing: 1px;
}

.slogan {
  font-size: 1.2rem;
  color: #5a7d8c;
  margin-top: 0;
}

.message {
  padding: 12px 15px;
  margin-bottom: 20px;
  border-radius: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.05);
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  border-left: 5px solid #c62828;
}

.success-message {
  background-color: #e8f5e9;
  color: #2e7d32;
  border-left: 5px solid #2e7d32;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
}

/* 开始界面样式 */
.start-container {
  max-width: 800px;
  margin: 0 auto;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  position: relative;
}

.fox-mascot {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.fox-mascot img {
  max-width: 280px;
  height: auto;
  animation: gentle-bounce 3s ease-in-out infinite;
}

@keyframes gentle-bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.prompt-section {
  margin-bottom: 25px;
}

.prompt-section h2 {
  font-size: 1.6rem;
  margin-bottom: 15px;
  color: #2b4255;
  text-align: center;
}

.prompt-section textarea {
  width: 100%;
  padding: 15px;
  border: 1px solid #c5e1a5;
  border-radius: 15px;
  font-size: 16px;
  resize: vertical;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05);
  background-color: #ffffff;
  color: #455a64;
  font-family: inherit;
}

.prompt-section textarea:focus {
  outline: none;
  border-color: #8bc34a;
  box-shadow: 0 0 0 3px rgba(139, 195, 74, 0.2);
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 25px;
}

.button-group.center {
  justify-content: center;
}

.primary-button {
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 30px;
  padding: 15px 30px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.primary-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(76, 175, 80, 0.4);
}

.primary-button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.star-icon {
  font-size: 20px;
  margin-right: 4px;
}

.hint-text {
  text-align: center;
  font-size: 14px;
  color: #78909c;
  margin-top: 20px;
  font-style: italic;
}

/* 故事界面样式 */
.story-container {
  display: flex;
  gap: 25px;
  align-items: stretch;
}

.story-column {
  flex: 1;
}

.image-column {
  flex: 1.2;
}

.story-box {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.story-box h2 {
  color: #2b4255;
  font-size: 1.4rem;
  margin-bottom: 15px;
  text-align: center;
}

.story-text {
  flex: 1;
  font-size: 18px;
  line-height: 1.7;
  color: #37474f;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05);
  overflow-y: auto;
  max-height: 350px;
}

.secondary-button {
  background-color: #90caf9;
  color: #1a237e;
  border: none;
  border-radius: 20px;
  padding: 10px 15px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  font-weight: 500;
  box-shadow: 0 3px 6px rgba(33, 150, 243, 0.2);
}

.secondary-button:hover {
  background-color: #64b5f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
}

.secondary-button:disabled {
  background-color: #e3f2fd;
  color: #90a4ae;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.image-section {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.image-container {
  width: 100%;
  height: 320px;
  border-radius: 15px;
  overflow: hidden;
  position: relative;
  margin-bottom: 25px;
  background-color: #ffffff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: center;
  align-items: center;
}

.story-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  color: #78909c;
  font-size: 18px;
}

.option-section {
  margin-top: 15px;
}

.options-container h3 {
  color: #2b4255;
  font-size: 1.3rem;
  margin-bottom: 15px;
  text-align: center;
}

.option-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-button {
  background-color: #ffcc80;
  color: #e65100;
  border: none;
  border-radius: 15px;
  padding: 15px 20px;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 3px 6px rgba(255, 152, 0, 0.2);
  position: relative;
  font-weight: 500;
  padding-right: 35px;
}

.option-button::after {
  content: '👉';
  position: absolute;
  right: 15px;
  opacity: 0;
  transition: all 0.3s;
}

.option-button:hover {
  background-color: #ffb74d;
  transform: translateX(5px);
  box-shadow: 0 5px 10px rgba(255, 152, 0, 0.3);
}

.option-button:hover::after {
  opacity: 1;
  transform: translateX(3px);
}

.option-button.selected {
  background-color: #ffa726;
  color: #ffffff;
  font-weight: bold;
  box-shadow: 0 5px 12px rgba(255, 152, 0, 0.4);
}

.option-button:disabled {
  background-color: #ffe0b2;
  color: #bdbdbd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  border-radius: 15px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(76, 175, 80, 0.2);
  border-left-color: #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

/* 底部装饰 */
.footer-decoration {
  position: fixed;
  bottom: -10px;
  right: 20px;
  z-index: 0;
}

.footer-fox {
  width: 120px;
  height: auto;
  transform: scaleX(-1);
  opacity: 0.7;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 响应式布局 */
@media (max-width: 900px) {
  .story-container {
    flex-direction: column;
  }

  .story-column,
  .image-column {
    flex: none;
  }

  .story-box {
    margin-bottom: 25px;
  }

  .story-text {
    max-height: 200px;
  }

  .image-container {
    height: 250px;
  }

  .footer-fox {
    width: 80px;
  }
}

@media (max-width: 600px) {
  .content-container {
    padding: 15px;
  }

  .start-container,
  .story-box,
  .image-section {
    padding: 15px;
  }

  h1 {
    font-size: 2rem;
  }

  .option-button {
    font-size: 14px;
    padding: 12px 15px;
  }

  .button-group {
    flex-direction: column;
  }

  .fox-mascot img {
    max-width: 200px;
  }
}

.image-switcher {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.image-switcher button {
  background: #90caf9;
  border: none;
  border-radius: 8px;
  padding: 4px 12px;
  color: #1a237e;
  cursor: pointer;
  font-size: 14px;
}

.image-switcher span {
  color: #2b4255;
  font-size: 14px;
}
</style>
