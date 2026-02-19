<template>
  <div class="excel-uploader">
    <div class="upload-section">
      <div 
        v-for="(config, key) in fileConfigs" 
        :key="key"
        class="upload-item"
        :class="{ 
          'has-file': files[key as FileType],
          'error': hasError(key as FileType)
        }"
      >
        <label class="upload-label">
          <span class="label-text">{{ config.label }}</span>
          <span v-if="config.required" class="required">*</span>
        </label>
        
        <div class="upload-zone" @click="triggerFileInput(key as FileType)">
          <input
            :ref="el => setFileInputRef(el, key as FileType)"
            type="file"
            accept=".xlsx,.xls,.csv"
            @change="(e) => handleFileChange(e, key as FileType)"
            class="file-input"
          />
          
          <div v-if="!files[key as FileType]" class="upload-placeholder">
            <span class="upload-icon">📄</span>
            <span class="upload-text">点击上传或拖拽文件</span>
            <span class="upload-hint">支持 .xlsx, .xls, .csv</span>
          </div>
          
          <div v-else class="file-info">
            <span class="file-icon">✓</span>
            <span class="file-name">{{ files[key as FileType]?.name }}</span>
            <button 
              class="remove-btn" 
              @click.stop="removeFile(key as FileType)"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div v-if="hasError(key as FileType)" class="file-errors">
          <div 
            v-for="error in getFileErrors(key as FileType)" 
            :key="error.field"
            class="error-item"
          >
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="validationErrors.length > 0" class="validation-summary">
      <h4>数据校验结果：</h4>
      <ul>
        <li 
          v-for="(error, index) in validationErrors" 
          :key="index"
          :class="error.file === '文件' && error.field === '解析' ? 'parse-error' : ''"
        >
          <strong>{{ error.file }}</strong> - {{ error.field }}: {{ error.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { ValidationError } from '@/types/stock'

type FileType = 'benefit' | 'debt' | 'cash' | 'keyIndex'

const props = defineProps<{
  validationErrors: ValidationError[]
}>()

const emit = defineEmits<{
  (e: 'files-selected', files: Partial<Record<FileType, File>>): void
}>()

const fileConfigs = {
  benefit: { label: '利润表', required: true },
  debt: { label: '资产负债表', required: true },
  cash: { label: '现金流量表', required: true },
  keyIndex: { label: '关键指标（可选）', required: false }
}

const files = reactive<Partial<Record<FileType, File>>>({})
const fileInputRefs = ref<Partial<Record<FileType, HTMLInputElement>>>({})

const setFileInputRef = (el: any, type: FileType) => {
  if (el) {
    fileInputRefs.value[type] = el as HTMLInputElement
  }
}

function triggerFileInput(type: FileType) {
  fileInputRefs.value[type]?.click()
}

function handleFileChange(event: Event, type: FileType) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (file) {
    files[type] = file
    emit('files-selected', { ...files })
  }
}

function removeFile(type: FileType) {
  delete files[type]
  if (fileInputRefs.value[type]) {
    fileInputRefs.value[type]!.value = ''
  }
  emit('files-selected', { ...files })
}

function hasError(type: FileType): boolean {
  return props.validationErrors.some(e => {
    const fileMap: Record<FileType, string> = {
      benefit: '利润表',
      debt: '资产负债表',
      cash: '现金流量表',
      keyIndex: '关键指标'
    }
    return e.file === fileMap[type]
  })
}

function getFileErrors(type: FileType): ValidationError[] {
  const fileMap: Record<FileType, string> = {
    benefit: '利润表',
    debt: '资产负债表',
    cash: '现金流量表',
    keyIndex: '关键指标'
  }
  return props.validationErrors.filter(e => e.file === fileMap[type])
}
</script>

<style scoped>
.excel-uploader {
  margin-bottom: 24px;
}

.upload-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.upload-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: border-color 0.2s;
}

.upload-item.has-file {
  border-color: var(--success-color);
}

.upload-item.error {
  border-color: var(--danger-color);
}

.upload-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--danger-color);
}

.upload-zone {
  position: relative;
  border: 2px dashed var(--border-color);
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-zone:hover {
  border-color: var(--primary-color);
  background: rgba(245, 158, 11, 0.05);
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 24px;
  opacity: 0.6;
}

.upload-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.upload-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.file-icon {
  color: var(--success-color);
  font-weight: bold;
}

.file-name {
  font-size: 14px;
  color: var(--text-primary);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
  line-height: 1;
  transition: color 0.2s;
}

.remove-btn:hover {
  color: var(--danger-color);
}

.file-errors {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(239, 68, 68, 0.3);
}

.error-item {
  font-size: 12px;
  color: var(--danger-color);
  margin-bottom: 4px;
}

.validation-summary {
  margin-top: 16px;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
}

.validation-summary h4 {
  margin: 0 0 12px 0;
  color: var(--danger-color);
  font-size: 14px;
}

.validation-summary ul {
  margin: 0;
  padding-left: 20px;
}

.validation-summary li {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.validation-summary li.parse-error {
  color: var(--danger-color);
  font-weight: 500;
}

@media (max-width: 768px) {
  .upload-section {
    grid-template-columns: 1fr;
  }
}
</style>
