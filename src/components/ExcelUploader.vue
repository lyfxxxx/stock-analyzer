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
  margin-bottom: var(--space-6, 24px);
}

.upload-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4, 16px);
}

.upload-item {
  background-color: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl, 12px);
  padding: var(--space-4, 16px);
  transition: border-color var(--transition-base), background-color var(--transition-base);
}

.upload-item.has-file {
  border-color: var(--color-success);
  background-color: var(--color-success-bg);
}

.upload-item.error {
  border-color: var(--color-danger);
  background-color: var(--color-danger-bg);
}

.upload-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: var(--space-3, 12px);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--color-danger);
}

.upload-zone {
  position: relative;
  border: 2px dashed var(--border-secondary);
  border-radius: var(--radius-lg, 8px);
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
}

.upload-zone:hover {
  border-color: var(--brand-primary);
  background-color: var(--brand-primary-light);
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
  color: var(--text-muted);
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
  color: var(--color-success);
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
  transition: color var(--transition-fast);
}

.remove-btn:hover {
  color: var(--color-danger);
}

.file-errors {
  margin-top: var(--space-2, 8px);
  padding-top: var(--space-2, 8px);
  border-top: 1px solid var(--color-danger-bg);
}

.error-item {
  font-size: 12px;
  color: var(--color-danger-text);
  margin-bottom: 4px;
}

.validation-summary {
  margin-top: var(--space-4, 16px);
  padding: var(--space-4, 16px);
  background-color: var(--color-danger-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-lg, 8px);
}

.validation-summary h4 {
  margin: 0 0 var(--space-3, 12px) 0;
  color: var(--color-danger-text);
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
  color: var(--color-danger-text);
  font-weight: 500;
}

@media (max-width: 768px) {
  .upload-section {
    grid-template-columns: 1fr;
  }
}
</style>
