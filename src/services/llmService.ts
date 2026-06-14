/**
 * fetchAgentResponse
 * 模拟获取智能代理响应的接口函数
 * @param input 用户发送的原始文本
 * @returns 包含模拟流响应结果的 Promise
 */
export const fetchAgentResponse = (input: string): Promise<string> => {
  return new Promise<string>((resolve) => {
    // 模拟 2 秒的网络延迟响应
    setTimeout(() => {
      resolve(`[Mock Response] 收到您的消息: "${input}"。Harri 状态正常，已顺利完成计算流分析。`);
    }, 2000);
  });
};
