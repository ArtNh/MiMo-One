import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 系统配置持久化状态接口
export interface SettingsState {
  apiKey: string;
  apiBaseUrl: string;
  defaultModel: string;
  maxTokens: number;
  defaultWorkspacePath: string;
  setSettings: (settings: Partial<Omit<SettingsState, 'setSettings'>>) => void;
}

// 建立并持久化系统配置文件
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      apiBaseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      maxTokens: 2048,
      defaultWorkspacePath: '',
      setSettings: (newSettings) => set((state) => ({ ...state, ...newSettings }))
    }),
    {
      name: 'mimo-settings-cache', // 物理持久化至本地 localStorage 键名
      storage: createJSONStorage(() => localStorage)
    }
  )
);
