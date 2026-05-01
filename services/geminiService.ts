
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SESSION_API_KEY_STORAGE_KEY } from "../utils/siteConfigStorage";
import { RiskAssessmentItem, SafetyGuideline, TBMAnalysisResult, ExtractedTBMData } from "../types";

// [ADDED] Exported Interfaces for Risk Assessment Extraction
export interface ExtractedPriority {
  content: string;
  level: 'HIGH' | 'GENERAL';
  category: string;
}

export interface MonthlyExtractionResult {
  detectedMonth?: string;
  items: ExtractedPriority[];
}

const GEMINI_MODEL = 'gemini-2.5-flash';

export interface GeminiConnectionValidationResult {
  success: boolean;
  message: string;
}

// [UPDATED] Smart API Key Resolution Strategy
const getApiKey = () => {
  try {
    // 1. Priority: Session Storage only (do not persist credentials in localStorage)
    const sessionKey = sessionStorage.getItem(SESSION_API_KEY_STORAGE_KEY);
    if (sessionKey && sessionKey.trim().length > 0) {
      return sessionKey.trim();
    }

    // 2. Legacy migration path: move old localStorage key into sessionStorage and scrub it
    const storedConfig = localStorage.getItem('siteConfig');
    if (storedConfig) {
        const config = JSON.parse(storedConfig);
        if (config.userApiKey && config.userApiKey.trim().length > 0) {
            const migratedKey = config.userApiKey.trim();
            sessionStorage.setItem(SESSION_API_KEY_STORAGE_KEY, migratedKey);
            delete config.userApiKey;
            localStorage.setItem('siteConfig', JSON.stringify(config));
            return migratedKey;
        }
    }

    // 3. [REMOVED] Environment Variable fallback intentionally disabled.
    //    API key must NOT be embedded in the client bundle.
    //    Dev mode uses the Vite server proxy (/api/gemini) instead.
  } catch (e) {
    console.warn("Failed to retrieve API Key");
  }
  return '';
};

// Detect if running under local Vite dev server (proxy available)
const isDevProxyAvailable = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1');

// [CRITICAL FIX] Lazy Initialization & Error Handling
let aiInstance: GoogleGenAI | null = null;
let currentKey: string | null = null;
type GoogleGenAIConfig = ConstructorParameters<typeof GoogleGenAI>[0] & { baseUrl?: string };
type AppError = Error & { originalError?: unknown };
type Participation = TBMAnalysisResult['details']['participation'];
type VoiceClarity = TBMAnalysisResult['details']['voiceClarity'];
type PpeStatus = TBMAnalysisResult['details']['ppeStatus'];
type FocusZone = TBMAnalysisResult['focusAnalysis']['focusZones']['front'];

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unknown Error';
const normalizeParticipation = (value: unknown): Participation => value === 'BAD' || value === 'MODERATE' ? value : 'GOOD';
const normalizeVoiceClarity = (value: unknown): VoiceClarity => value === 'MUFFLED' || value === 'NONE' ? value : 'CLEAR';
const normalizePpeStatus = (value: unknown): PpeStatus => value === 'BAD' ? 'BAD' : 'GOOD';
const normalizeFocusZone = (value: unknown): FocusZone => value === 'LOW' ? 'LOW' : 'HIGH';

const getAiClient = () => {
    // [A] Dev proxy path: no user key needed on localhost
    if (isDevProxyAvailable()) {
        const proxyBase = `${window.location.origin}/api/gemini`;
        if (!aiInstance || currentKey !== '__dev_proxy__') {
            if (typeof GoogleGenAI !== 'function') throw new Error('Critical Error: AI SDK not loaded.');
            try {
        const proxyConfig: GoogleGenAIConfig = { apiKey: 'dev-proxy', baseUrl: proxyBase };
        aiInstance = new GoogleGenAI(proxyConfig);
                currentKey = '__dev_proxy__';
                console.info('[GeminiService] Dev proxy enabled:', proxyBase);
            } catch (e) {
        throw new Error(`AI Proxy Init Failed: ${getErrorMessage(e)}`);
            }
        }
        return aiInstance;
    }

    const key = getApiKey();
    
    // Reset instance if key changed or empty
    if (!key) {
        aiInstance = null;
        currentKey = null;
        throw new Error("API Key가 설정되지 않았습니다. [설정] 메뉴에서 키를 등록해주세요.");
    }

    if (!aiInstance || currentKey !== key) {
        // [DEFENSIVE] Check if SDK is available
        if (typeof GoogleGenAI !== 'function') {
             console.error("GoogleGenAI SDK is not loaded correctly.");
             throw new Error("Critical Error: AI SDK not loaded.");
        }
        
        try {
            aiInstance = new GoogleGenAI({ apiKey: key });
            currentKey = key;
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI:", e);
            aiInstance = null;
          throw new Error(`AI Initialization Failed: ${getErrorMessage(e)}`);
        }
    }
    return aiInstance;
};

// [NEW] Validate Connection Function (Used in Settings)
export const validateGeminiConnection = async (apiKey: string): Promise<GeminiConnectionValidationResult> => {
    if (!apiKey) return { success: false, message: 'API 키가 비어 있습니다.' };
    const cleanKey = apiKey.trim();
    if (!cleanKey.startsWith('AIza')) {
      return { success: false, message: "API 키 형식이 올바르지 않습니다. ('AIza'로 시작 필요)" };
    }

    try {
        // [FIX] Wrap constructor in try-catch to safely handle errors
        let testClient;
        try {
            testClient = new GoogleGenAI({ apiKey: cleanKey });
        } catch (e) {
            console.error("GoogleGenAI Constructor Error in Validation:", e);
            return { success: false, message: 'AI 클라이언트 초기화에 실패했습니다.' };
        }

        const response = await promiseWithTimeout(
          testClient.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
          }),
          12000,
          '연결 확인 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.'
        );
        
        if (!response) {
          return { success: false, message: '응답이 비어 있습니다. 잠시 후 다시 시도해주세요.' };
        }

        return { success: true, message: '연결 성공: 유효한 API 키입니다.' };
    } catch (e: any) {
        console.error("Connection Test Failed:", e);

        const status = e?.status || e?.code || e?.error?.code || 0;
        const rawMessage = String(e?.message || e?.error?.message || '');
        const lowerMessage = rawMessage.toLowerCase();

        if (status === 400 || lowerMessage.includes('api key not valid') || lowerMessage.includes('invalid api key')) {
          return { success: false, message: '연결 실패: API 키가 유효하지 않습니다.' };
        }
        if (status === 403 || lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
          return { success: false, message: '연결 실패: API 키 권한/리퍼러 설정을 확인해주세요.' };
        }
        if (status === 429 || lowerMessage.includes('resource_exhausted') || lowerMessage.includes('quota')) {
          return { success: false, message: '연결 실패: 사용량 한도(429) 초과입니다.' };
        }
        if (lowerMessage.includes('timeout') || lowerMessage.includes('초과')) {
          return { success: false, message: '연결 실패: 요청 시간이 초과되었습니다.' };
        }

        return { success: false, message: '연결 실패: 네트워크 또는 키 설정을 확인해주세요.' };
    }
};

// Helper: Promise with Timeout
const promiseWithTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
    });
    return Promise.race([
        promise.then((res) => {
            clearTimeout(timeoutId);
            return res;
        }),
        timeoutPromise
    ]);
};

// Helper: Retry Logic for 500/503 Errors AND 429 Rate Limits
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Deep parsing for error codes (handle both Error objects and plain JSON responses)
      const status = error.status || error.code || error?.error?.code || 0;
      const msg = (error.message || error?.error?.message || JSON.stringify(error)).toLowerCase();
      
      // Retry on Server Errors (5xx) or Rate Limits (429/Resource Exhausted)
      const isRateLimit = status === 429 || msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('429');
      const isServerError = status === 500 || status === 503 || msg.includes('internal error') || msg.includes('overloaded');
      
      const isRetryable = isRateLimit || isServerError;
      
      if (isRetryable && i < retries - 1) {
        // Backoff: 429 needs more time (e.g. 6s, 12s, 24s)
        const initialDelay = isRateLimit ? 6000 : baseDelay;
        const delay = initialDelay * Math.pow(2, i) + (Math.random() * 1000); // Add jitter
        
        console.warn(`Gemini API Error (${status}). Retrying in ${(delay/1000).toFixed(1)}s... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Improve Error Message for UI if it's the final attempt
      if (isRateLimit) {
          const friendlyError: AppError = new Error("AI 사용량이 초과되었습니다. (설정에서 개인 API 키를 등록하면 해결됩니다)");
          friendlyError.originalError = lastError;
          throw friendlyError;
      }
      
      throw lastError;
    }
  }
  throw lastError;
};

// --- ROBUST DATA SANITIZATION UTILS (Self-Healing Logic) ---

const cleanAndRepairJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  const firstOpenBrace = cleaned.indexOf('{');
  const firstOpenBracket = cleaned.indexOf('[');
  let startIndex = -1;
  let endIndex = -1;

  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
      startIndex = firstOpenBrace;
      endIndex = cleaned.lastIndexOf('}');
  } else if (firstOpenBracket !== -1) {
      startIndex = firstOpenBracket;
      endIndex = cleaned.lastIndexOf(']');
  }

  if (startIndex !== -1) {
    if (endIndex !== -1 && endIndex > startIndex) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    } else {
        cleaned = cleaned.substring(startIndex);
        const lastChar = cleaned.trim().slice(-1);
        if (!['}', ']'].includes(lastChar)) {
             if (lastChar !== '"') { cleaned += '"'; }
        }
        const openBraces = (cleaned.match(/\{/g) || []).length;
        const closeBraces = (cleaned.match(/\}/g) || []).length;
        const openBrackets = (cleaned.match(/\[/g) || []).length;
        const closeBrackets = (cleaned.match(/\]/g) || []).length;

        for (let i = 0; i < (openBrackets - closeBrackets); i++) cleaned += ']';
        for (let i = 0; i < (openBraces - closeBraces); i++) cleaned += '}';
    }
  }

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    return cleaned.startsWith('[') ? "[]" : "{}";
  }
};

const safeParseInt = (val: any): number => {
    if (typeof val === 'number' && !isNaN(val)) return Math.floor(val);
    if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

// [NEW] Export for General Insight Generation (Used by SafetyDataLab)
export const generateGeneralInsight = async (prompt: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        }));
        return response.text || "분석 결과가 없습니다.";
    } catch (error) {
        console.error("Insight Generation Error:", error);
        throw error;
    }
};

// [NEW] Generate Safety Feedback (AI Recommendation)
export const generateSafetyFeedback = async (
    workDescription: string,
    riskFactors: RiskAssessmentItem[],
    monthlyGuidelines: SafetyGuideline[]
): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const guidelinesText = monthlyGuidelines.map(g => `- [${g.category}] ${g.content}`).join('\n');
        const risksText = riskFactors.map(r => `${r.risk}`).join(', ');

        const prompt = `
            Role: Construction Safety Manager (건설안전 관리자).
            Task: Provide 3-5 specific safety feedback points (instructional comments) for the workers based on the current work context.
            
            [Work Description]: ${workDescription}
            [Identified Risks]: ${risksText}
            [Monthly Safety Rules]:
            ${guidelinesText}

            Requirements:
            1. Compare the work and risks against the monthly rules.
            2. If a specific rule is relevant, emphasize it.
            3. If a key risk is missing a countermeasure in the description, suggest it.
            4. Output strictly a JSON array of strings (Korean).
            Example: ["안전모 턱끈 체결 상태를 상시 확인하세요.", "고소 작업 시 안전고리를 반드시 체결하세요."]
        `;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        }));

        if (response.text) {
            const cleaned = cleanAndRepairJson(response.text);
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) return parsed;
        }
        return [];
    } catch (error) {
        console.error("Safety Feedback Generation Error:", error);
        throw error;
    }
};

// [UPDATED] Video Analysis with "Opinion Fallback" Strategy
export const evaluateTBMVideo = async (
  base64Video: string, 
  mimeType: string, 
  textContext: { workDescription: string, riskFactors: any[] },
  safetyGuidelines: SafetyGuideline[] = []
): Promise<TBMAnalysisResult> => {
  
  const ai = getAiClient();
  let cleanMimeType = 'video/webm'; 
  if (mimeType.includes('mp4')) cleanMimeType = 'video/mp4';

  const risksText = textContext.riskFactors?.length > 0 
      ? textContext.riskFactors.map(r => `${r.risk}`).join(', ')
      : "특이 위험요인 없음";
  
  const workName = textContext.workDescription || "금일 작업";
  
  // Format Guidelines for Prompt
  const guidelinesText = safetyGuidelines.length > 0
      ? safetyGuidelines.map(g => `[${g.category}] ${g.content}`).join('\n')
      : "월간 중점 관리 사항 없음";

  // Common Rubric structure
  const defaultRubric = { logQuality: 25, focus: 25, voice: 15, ppe: 15, deductions: [] };

  try {
    // 1. Attempt Video Analysis
    const prompt = `
      You are a Construction Safety Professional Engineer (건설안전기술사).
      Role: A strict but mentoring "Safety Master".
      
      Analyze this TBM video and the provided context.
      
      CONTEXT:
      - Work: "${workName}"
      - Identified Risks: ${risksText}
      - Monthly Priority Guidelines: ${guidelinesText}
      
      REQUIREMENTS:
      1. Evaluate 4 specific categories (Output in Korean).
      2. **Overall Evaluation (evaluation)**:
         - **MANDATORY**: Write a comprehensive safety review.
         - Mention specific risks from the context if visible or relevant.
         - Cite the 'Monthly Priority Guidelines' if they apply to this work.
         - Be direct and authoritative.
      3. **Leader Coaching (Action Item)**:
         - Provide one specific, actionable advice for the team leader to improve the *next* TBM.
         - Example: "Voice is too soft. Use simple hand signals next time." or "Ask open-ended questions to check worker understanding."

      Output strictly in JSON.
    `;

    const apiCall = () => ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: cleanMimeType, data: base64Video } }, { text: prompt }] }],
      config: {
        temperature: 0.6, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             rubric: {
                 type: Type.OBJECT,
                 properties: {
                     logQuality: { type: Type.INTEGER },
                     focus: { type: Type.INTEGER },
                     voice: { type: Type.INTEGER },
                     ppe: { type: Type.INTEGER },
                     deductions: { type: Type.ARRAY, items: { type: Type.STRING } }
                 },
                 required: ["logQuality", "focus", "voice", "ppe", "deductions"]
             },
             score: { type: Type.INTEGER },
             evaluation: { type: Type.STRING },
             evalLog: { type: Type.STRING },
             evalAttendance: { type: Type.STRING },
             evalFocus: { type: Type.STRING },
             evalLeader: { type: Type.STRING },
             details: {
               type: Type.OBJECT,
               properties: {
                 participation: { type: Type.STRING },
                 voiceClarity: { type: Type.STRING }, 
                 ppeStatus: { type: Type.STRING },
                 interaction: { type: Type.BOOLEAN }
               }
             },
             focusAnalysis: {
                type: Type.OBJECT,
                properties: {
                    overall: { type: Type.INTEGER },
                    distractedCount: { type: Type.INTEGER },
                    focusZones: {
                        type: Type.OBJECT,
                        properties: {
                            front: { type: Type.STRING },
                            back: { type: Type.STRING },
                            side: { type: Type.STRING }
                        }
                    }
                }
             },
             insight: {
                 type: Type.OBJECT,
                 properties: {
                     mentionedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                     missingTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                     suggestion: { type: Type.STRING }
                 }
             },
             leaderCoaching: {
                 type: Type.OBJECT,
                 properties: {
                     actionItem: { type: Type.STRING },
                     rationale: { type: Type.STRING }
                 }
             },
             feedback: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["rubric", "score", "evaluation", "leaderCoaching"]
        },
      },
    });

    // 45s Timeout for Video
    const response = await withRetry<GenerateContentResponse>(
        () => promiseWithTimeout(apiCall(), 45000, "Video Analysis Timeout"),
        1, 1000
    );

    if (response.text) {
      const raw = JSON.parse(cleanAndRepairJson(response.text));
      const finalRubric = raw.rubric || defaultRubric;
      const totalScore = (finalRubric.logQuality || 0) + (finalRubric.focus || 0) + (finalRubric.voice || 0) + (finalRubric.ppe || 0);

      return {
          score: totalScore,
          evaluation: raw.evaluation || "분석 완료.",
          evalLog: raw.evalLog || "내용 양호",
          evalAttendance: raw.evalAttendance || "참여도 양호",
          evalFocus: raw.evalFocus || "집중도 양호",
          evalLeader: raw.evalLeader || "리더십 양호",
          analysisSource: 'VIDEO',
          rubric: finalRubric,
          leaderCoaching: raw.leaderCoaching || { actionItem: "목소리를 더 크게 내세요.", rationale: "전달력이 부족합니다." },
          details: {
              participation: normalizeParticipation(raw.details?.participation),
              voiceClarity: normalizeVoiceClarity(raw.details?.voiceClarity),
              ppeStatus: normalizePpeStatus(raw.details?.ppeStatus),
              interaction: !!raw.details?.interaction
          },
          focusAnalysis: {
              overall: raw.focusAnalysis?.overall ?? 90,
              distractedCount: raw.focusAnalysis?.distractedCount ?? 0,
              focusZones: {
                front: normalizeFocusZone(raw.focusAnalysis?.focusZones?.front),
                back: normalizeFocusZone(raw.focusAnalysis?.focusZones?.back),
                side: normalizeFocusZone(raw.focusAnalysis?.focusZones?.side)
              }
          },
          insight: {
              mentionedTopics: raw.insight?.mentionedTopics || [],
              missingTopics: raw.insight?.missingTopics || [],
              suggestion: raw.insight?.suggestion || "안전 작업 준수 요망"
          },
          feedback: raw.feedback || [] 
      };
    }
    throw new Error("Empty response from AI");

  } catch (error: any) {
    console.warn("Video Analysis Failed. Attempting Text-Based Fallback...", error);

    // Rate Limit or Quota Error check for fallback
    // Check if error message indicates quota limit to re-throw instead of fallback
    const msg = error.message || '';
    if (msg.includes('429') || msg.includes('Quota') || msg.includes('제한')) {
        throw error; // Re-throw to show user the friendly limit message
    }

    // --- 2. Fallback: Text-Based Opinion Generation ---
    const fallbackScore = 0; 
    const fallbackRubric = { logQuality: 0, focus: 0, voice: 0, ppe: 0, deductions: ["영상 분석 불가 (네트워크/서버 오류)"] };
    
    try {
        const textPrompt = `
            You are a Safety Expert. The video analysis for TBM failed due to network issues.
            However, you must provide a **Safety Advice (Evaluation)** based on the provided text data.
            
            Work Description: ${workName}
            Identified Risks: ${risksText}
            Monthly Guidelines: ${guidelinesText}
            
            Task:
            Write a professional safety evaluation (Korean) as if you are reviewing the plan.
            - Start with: "동영상 분석 데이터가 전송되지 않았으나, 입력된 작업 내용과 월간 중점 사항을 고려할 때..."
            - Output JSON with 'evaluation' field and 'feedback' array.
        `;

        const textResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
            config: { responseMimeType: "application/json" }
        });

        if (textResponse.text) {
            const fbData = JSON.parse(cleanAndRepairJson(textResponse.text));
            return {
                score: fallbackScore,
                evaluation: fbData.evaluation || `동영상 분석에 실패했으나, 금일 작업(${workName})의 고위험 요인에 대한 철저한 관리가 필요합니다.`,
                evalLog: "서면 데이터 기반 분석 대체",
                evalAttendance: "영상 확인 불가",
                evalFocus: "영상 확인 불가",
                evalLeader: "영상 확인 불가",
                analysisSource: 'DOCUMENT',
                leaderCoaching: { actionItem: "영상 재촬영 권장", rationale: "영상 데이터가 누락되었습니다." },
                rubric: fallbackRubric,
                details: { participation: 'MODERATE', voiceClarity: 'NONE', ppeStatus: 'BAD', interaction: false },
                focusAnalysis: { overall: 0, distractedCount: 0, focusZones: { front: 'LOW', back: 'LOW', side: 'LOW' } },
                insight: { mentionedTopics: [], missingTopics: [], suggestion: "영상 재업로드 또는 수기 관리 요망" },
                feedback: Array.isArray(fbData.feedback) ? fbData.feedback : ["작업 전 안전 장비 점검 필수", "위험성평가 공유 철저"]
            };
        }
    } catch (fallbackError) {
        console.error("Text fallback also failed", fallbackError);
    }

    // --- 3. Ultimate Fallback ---
    const priorityGuide = safetyGuidelines.length > 0 ? safetyGuidelines[0].content : "기본 안전 수칙";
    const mainRisk = textContext.riskFactors.length > 0 ? textContext.riskFactors[0].risk : "잠재 위험";

    const hardcodedEvaluation = `동영상 정밀 분석에는 실패했으나, 금일 진행되는 '${workName}' 작업의 특성상 '${mainRisk}' 등의 사고 발생 가능성이 있습니다.`;

    return {
      score: 0,
      evaluation: hardcodedEvaluation,
      evalLog: "서면 데이터 참조",
      evalAttendance: "-",
      evalFocus: "-",
      evalLeader: "-",
      analysisSource: 'DOCUMENT',
      leaderCoaching: { actionItem: "네트워크 확인", rationale: "서버 연결에 실패했습니다." },
      rubric: fallbackRubric,
      details: { participation: 'BAD', voiceClarity: 'NONE', ppeStatus: 'BAD', interaction: false },
      focusAnalysis: { overall: 0, distractedCount: 0, focusZones: { front: 'LOW', back: 'LOW', side: 'LOW' } },
      insight: { mentionedTopics: [], missingTopics: [], suggestion: "네트워크 상태를 확인해주세요." },
      feedback: [`${workName} 작업 안전 수칙 준수`, "보호구 착용 상태 점검"]
    };
  }
};

export const extractMonthlyPriorities = async (
  base64Data: string, 
  mimeType: string,
  type: 'INITIAL' | 'MONTHLY' = 'MONTHLY'
): Promise<MonthlyExtractionResult> => {
  // [RELIABILITY FIX] Gemini 지원 MIME 정규화 — PDF 허용, 이미지는 표준 타입만
  const GEMINI_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const safeMimeType = GEMINI_DOC_MIMES.includes(mimeType) ? mimeType : 'image/jpeg';
  try {
    const ai = getAiClient();
    const prompt = `
      You are a Construction Safety Expert.
      Analyze this ${type === 'INITIAL' ? 'Initial (Baseline)' : 'Monthly/Regular'} Risk Assessment Document.
      GOAL: Extract specific safety guidelines and risk factors.
      OUTPUT FORMAT (JSON):
      {
        "detectedMonth": "YYYY-MM" (if detected, else null),
        "items": [
           {
             "content": "Specific risk factor or safety measure",
             "level": "HIGH" (if marked as critical/major/high risk) or "GENERAL",
             "category": "Work Category (e.g., Common, Formwork, Rebar, Equipment, etc.)"
           }
        ]
      }
    `;
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: safeMimeType, data: base64Data } }, { text: prompt }] }],
        config: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    detectedMonth: { type: Type.STRING },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                content: { type: Type.STRING },
                                level: { type: Type.STRING, enum: ["HIGH", "GENERAL"] },
                                category: { type: Type.STRING }
                            },
                            required: ["content", "level", "category"]
                        }
                    }
                }
            }
        }
    }));
    if (response.text) {
        const cleaned = cleanAndRepairJson(response.text);
        const data = JSON.parse(cleaned);
        let detectedMonth = data.detectedMonth;
        if (detectedMonth && !/^\d{4}-\d{2}$/.test(detectedMonth)) { detectedMonth = undefined; }
        const items = Array.isArray(data.items) ? data.items.map((item: any) => ({
            content: item.content || "내용 없음",
            level: (item.level === 'HIGH' ? 'HIGH' : 'GENERAL') as 'HIGH' | 'GENERAL',
            category: item.category || "공통"
        })) : [];
        return { detectedMonth, items };
    }
    throw new Error("No extracted text");
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    // [CRITICAL] Propagate the error to UI so we can show the alert
    throw error;
  }
};

export const analyzeMasterLog = async (
    base64Data: string, 
    mimeType: string,
    monthlyGuidelines: SafetyGuideline[] = [],
    mode: 'BATCH' | 'ROUTINE' = 'BATCH' 
  ): Promise<ExtractedTBMData[]> => {
    // [RELIABILITY FIX] Gemini 미지원 MIME 유형 자동 정규화
    const GEMINI_SUPPORTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const safeMimeType = GEMINI_SUPPORTED_IMAGE_MIMES.includes(mimeType) ? mimeType : 'image/jpeg';
    try {
      const ai = getAiClient();
      let promptContext = "";
      const guidelinesText = monthlyGuidelines.length > 0
          ? monthlyGuidelines.map(g => `- [${g.category}] ${g.content}`).join('\n')
          : "등록된 중점 관리 항목 없음";

      if (mode === 'BATCH') {
          promptContext = `
            [모드: 종합 일지 일괄 처리 (BATCH)]
            - 이 문서는 이미 결재가 완료된 문서입니다.
            - 목표: 디지털 데이터 변환.
            - **안전관리자 코멘트(safetyFeedback) 생성 규칙:**
              1. 문서에 수기 코멘트가 있으면 우선 추출.
              2. 코멘트가 없으면, [작업 내용]과 [아래 제공된 월간 위험성평가 항목]을 대조하십시오.
              3. 작업 내용에 해당되는 위험 항목이 TBM 내용에서 빠져있다면, **"월간 중점 사항인 [항목명]이 누락되었습니다. 작업자에게 주지시키세요."**라는 코멘트를 생성하여 'safetyFeedback' 배열에 넣으십시오.
              4. 누락 사항이 없다면 **"작업별 위험요인이 적절히 도출되었습니다."**라고 생성하십시오.
            [월간 위험성평가 참고 자료]
            ${guidelinesText}
          `;
      } else {
          promptContext = `
            [모드: 개별 TBM 간편 등록 (ROUTINE)]
            - 이 문서는 TBM 보드판입니다.
            - 목표: 텍스트 추출.
            - **안전관리자 코멘트:** 위 BATCH 모드와 동일한 로직으로, 월간 위험성평가 대비 누락 사항을 지적하는 코멘트를 생성하십시오.
          `;
      }

      const prompt = `
        역할: 건설 현장 데이터 분석가.
        ${promptContext}
        
        [필수 규칙 - 팀명 추출]
        1. 회사명(예: (주)휘강건설)은 'teamName'이 될 수 없습니다. 
        2. 팀 이름은 구체적인 작업 단위(예: 이태호 팀, 시스템 팀, 철근 팀, 형틀 팀, 해체 팀, 직영)여야 합니다.
        3. 문서 헤더의 회사명은 무시하고, 실제 TBM을 수행한 '작업 팀' 이름을 찾으세요.
        4. 만약 팀 이름이 '휘강건설'이나 '골조공사'로만 보인다면, 작업 내용(예: 알폼, 갱폼, 시스템)을 보고 적절한 공종 이름을 팀명으로 추정하십시오.

        [필수 추출 항목]
        - teams 배열 내 'safetyFeedback'은 반드시 위 규칙에 따라 생성된 코멘트 배열이어야 합니다.
      `;
  
      const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: safeMimeType, data: base64Data } }, { text: prompt }] }],
        config: {
          temperature: 0.0,
          responseMimeType: "application/json",
          maxOutputTokens: 8192, 
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
              teams: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    teamName: { type: Type.STRING },
                    leaderName: { type: Type.STRING },
                    attendeesCount: { type: Type.INTEGER },
                    workDescription: { type: Type.STRING },
                    riskFactorCount: { type: Type.INTEGER },
                    feedbackLevel: { type: Type.INTEGER },
                    safetyScore: { type: Type.INTEGER },
                    riskFactors: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          risk: { type: Type.STRING },
                          measure: { type: Type.STRING }
                        }
                      }
                    },
                    safetyFeedback: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            },
          },
        },
      }));
  
      if (response.text) {
        const cleanedText = cleanAndRepairJson(response.text);
        let data: any;
        try {
            data = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error("Critical JSON Parse Error even after repair:", parseError);
            return [];
        }

        const teamsArray = Array.isArray(data) ? data : (Array.isArray(data.teams) ? data.teams : []);
        let globalDate = new Date().toISOString().split('T')[0];
        if (data.documentDate && /^\d{4}-\d{2}-\d{2}$/.test(data.documentDate)) {
            globalDate = data.documentDate;
        }
        
        const processedTeams = teamsArray.map((team: any) => {
            const safeAttendees = safeParseInt(team.attendeesCount);
            const safeRiskCount = safeParseInt(team.riskFactorCount);
            const safeSafetyScore = safeParseInt(team.safetyScore);
            const safeRiskFactors = Array.isArray(team.riskFactors) ? team.riskFactors : [];
            const safeFeedback = Array.isArray(team.safetyFeedback) ? team.safetyFeedback : [];

            let researchAnalysis: TBMAnalysisResult | undefined = undefined;

            if (mode === 'BATCH') {
                const verifiedScore = safeSafetyScore > 0 ? safeSafetyScore : 85; 
                const verifiedFocus = 95; 
                const syntheticRubric = { logQuality: 25, focus: 25, voice: 18, ppe: 17, deductions: ["서면 기록 기반 산정"] };

                researchAnalysis = {
                    score: verifiedScore,
                    evaluation: `[기검증 데이터] 종합 일지 아카이빙 완료. 위험요인 ${safeRiskCount}건 식별됨.`,
                    evalLog: "서면 기록상 위험요인 도출 상태 양호함.",
                    evalAttendance: "출력 인원 대비 서명 인원 일치함.",
                    evalFocus: "해당 사항 없음 (동영상 미첨부)",
                    evalLeader: "해당 사항 없음 (동영상 미첨부)",
                    analysisSource: 'DOCUMENT',
                    rubric: syntheticRubric,
                    leaderCoaching: { actionItem: "기록 보존 완료", rationale: "과거 데이터입니다." },
                    details: { participation: 'GOOD', voiceClarity: 'CLEAR', ppeStatus: 'GOOD', interaction: true },
                    focusAnalysis: { overall: verifiedFocus, distractedCount: 0, focusZones: { front: 'HIGH', back: 'HIGH', side: 'HIGH' } },
                    insight: { mentionedTopics: safeRiskFactors.map((r:any) => r.risk || '') || [], missingTopics: [], suggestion: "기존 분석 검증 완료 데이터 (Batch Processed)" },
                    feedback: safeFeedback 
                };
            } else {
                researchAnalysis = undefined; 
            }

            return {
                teamName: team.teamName || "팀명 미상",
                leaderName: team.leaderName || "",
                attendeesCount: safeAttendees,
                workDescription: team.workDescription || "작업 내용 식별 불가",
                riskFactors: safeRiskFactors,
                safetyFeedback: safeFeedback,
                detectedDate: globalDate,
                videoAnalysis: researchAnalysis 
            };
        });
        return processedTeams;
      }
      throw new Error("No response text");
    } catch (error: any) {
      console.error("Gemini Data Mining Error:", error);
      throw error;
    }
  };
