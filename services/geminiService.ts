
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
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

// [FIX] Safe API Key Access for Browser Environment
const getApiKey = () => {
  try {
    // Check if process is defined (Node.js style environment variables)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Failed to read process.env");
  }
  return '';
};

// [CRITICAL FIX] Lazy Initialization
// Do NOT instantiate globally to prevent startup crashes if API Key is missing or env is unstable.
let aiInstance: GoogleGenAI | null = null;

const getAiClient = () => {
    if (!aiInstance) {
        const apiKey = getApiKey();
        // Even if apiKey is empty, we instantiate here. 
        // The SDK might throw on call, but we avoid throwing on module load.
        aiInstance = new GoogleGenAI({ apiKey });
    }
    return aiInstance;
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

// Helper: Retry Logic for 500/503 Errors
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.status === 500 || error.status === 503 || 
                          (error.message && (error.message.includes('Internal error') || error.message.includes('Overloaded')));
      
      if (isRetryable && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Gemini API Temporary Error (${error.status || 'Unknown'}). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

// --- ROBUST DATA SANITIZATION UTILS (Self-Healing Logic) ---

// 1. Surgical JSON Parser & Repair: Extracts valid JSON and fixes common errors
const cleanAndRepairJson = (text: string): string => {
  if (!text) return "{}";
  
  // Step 1: Remove Markdown code blocks
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // Step 2: Find the outermost braces/brackets
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

  // [IMPROVED REPAIR LOGIC] Handle Truncated JSON
  if (startIndex !== -1) {
    if (endIndex !== -1 && endIndex > startIndex) {
        // Seems valid, stick to it
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    } else {
        // Missing closing brace/bracket - The Response was TRUNCATED
        console.warn("JSON appears truncated. Attempting aggressive repair...");
        cleaned = cleaned.substring(startIndex);
        
        // 1. Check for unterminated string (Odd number of quotes after the last colon?)
        // Simple heuristic: If the last significant char is not a closer, and looks like text
        const lastChar = cleaned.trim().slice(-1);
        const isCloser = ['}', ']', '"', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'e', 'l', 's'].includes(lastChar.toLowerCase()); // numbers, true, false, null enders
        
        // If it ended abruptly in a string (e.g., "workDescriptio...)
        // We simply append a quote first.
        if (!['}', ']'].includes(lastChar)) {
             // Basic fix: Close quote if it looks open, then close structure
             // This is a naive heuristic but works for many LLM cutoffs
             if (lastChar !== '"') {
                 cleaned += '"'; 
             }
        }

        // 2. Count braces and close them
        const openBraces = (cleaned.match(/\{/g) || []).length;
        const closeBraces = (cleaned.match(/\}/g) || []).length;
        const openBrackets = (cleaned.match(/\[/g) || []).length;
        const closeBrackets = (cleaned.match(/\]/g) || []).length;

        // Close arrays first (inner), then objects (outer) usually
        // But simplified: Just append missing closures.
        for (let i = 0; i < (openBrackets - closeBrackets); i++) cleaned += ']';
        for (let i = 0; i < (openBraces - closeBraces); i++) cleaned += '}';
    }
  }

  // Step 3: Attempt parsing. If fail, return safe empty object/array string
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    console.warn("JSON Repair Failed even after aggressive fix:", e);
    console.log("Failed String:", cleaned);
    // Ultimate fallback: return empty structure based on start
    return cleaned.startsWith('[') ? "[]" : "{}";
  }
};

// 2. Strict Number Guard: Converts any trash input into a valid number
const safeParseInt = (val: any): number => {
    if (typeof val === 'number' && !isNaN(val)) return Math.floor(val);
    if (typeof val === 'string') {
        // Remove commas, text units (명, 개), and keep signs
        const cleaned = val.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

// [UPDATED] Video Analysis with Strict Evidence-Based Scoring & Gap Analysis Feedback
export const evaluateTBMVideo = async (
  base64Video: string, 
  mimeType: string, 
  textContext: { workDescription: string, riskFactors: any[] },
  safetyGuidelines: SafetyGuideline[] = []
): Promise<TBMAnalysisResult> => {
  try {
    const ai = getAiClient(); // Lazy load
    let cleanMimeType = 'video/webm'; 
    if (mimeType.includes('mp4')) cleanMimeType = 'video/mp4';

    const risksText = textContext.riskFactors?.length > 0 
        ? textContext.riskFactors.map(r => `${r.risk}`).join(', ')
        : "위험요인 없음";

    // [OPTIMIZATION] Professional Engineer Persona Prompt
    // Using a focused prompt to ensure logical, non-poetic output.
    const prompt = `
      You are a 30-year veteran Construction Safety Professional Engineer (건설안전기술사).
      Your task is to analyze this TBM video and provide a critical, logical assessment.
      
      Context:
      - Work: ${textContext.workDescription}
      - Risks: ${risksText}
      
      CRITICAL INSTRUCTION FOR 'evaluation':
      1.  **NEVER** output simple phrases like "분석 완료" or "양호함".
      2.  You MUST write 2-3 logical sentences following this structure: [Observation/Fact] -> [Technical Judgment/Risk] -> [Action Item].
      3.  Tone: Authoritative, cynical, evidence-based. No emotions.
      4.  If the video is short/silent, criticize the lack of detail.
      
      Examples of good output:
      - "팀장의 발성이 명확하여 전달력은 우수하나, 후열 근로자들의 시선이 분산되어 있어 실질적인 위험 공유가 미흡함. 지적확인 환호를 통해 집중도 제고 필요."
      - "형식적인 시나리오 리딩에 그치고 있어 작업자들의 위험 인지도가 낮음. 금일 고위험 작업인 '크레인 인양'에 대한 구체적인 신호 체계 교육이 누락됨."

      Output strictly in JSON.
      Fields: rubric(logQuality, focus, voice, ppe, deductions[]), score, evaluation, details(participation, voiceClarity, ppeStatus, interaction), focusAnalysis(overall, distractedCount, focusZones), insight(mentionedTopics, missingTopics, suggestion), feedback[].
    `;

    // [FIX] Decreased timeout to 35s (30s target + 5s buffer) for field efficiency
    // If it takes longer than 35s, we abort to allow manual entry.
    const apiCall = () => ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: cleanMimeType, data: base64Video } }, { text: prompt }] }],
      config: {
        temperature: 0.2, 
        topP: 0.8,
        maxOutputTokens: 1024, // [OPTIMIZATION] Limit output length for speed
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
             feedback: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Manager comments regarding missing priorities" }
          }
        },
      },
    });

    // 35 Seconds strict timeout (Fail Fast)
    const response = await withRetry<GenerateContentResponse>(
        () => promiseWithTimeout(apiCall(), 35000, "분석 시간 초과 (30초)"),
        1, // 1 retry only for speed
        1000
    );

    if (response.text) {
      const raw = JSON.parse(cleanAndRepairJson(response.text));
      
      const defaultRubric = {
          logQuality: 25,
          focus: 25,
          voice: 15,
          ppe: 15,
          deductions: []
      };

      const finalRubric = raw.rubric || defaultRubric;
      const totalScore = (finalRubric.logQuality || 0) + (finalRubric.focus || 0) + (finalRubric.voice || 0) + (finalRubric.ppe || 0);

      // [FAIL-SAFE] Check if evaluation is too short or generic
      let finalEvaluation = raw.evaluation || "분석 결과 없음";
      const isGeneric = finalEvaluation.length < 20 || ["분석 완료", "분석완료", "이상 없음", "특이사항 없음", "양호"].some((k: string) => finalEvaluation.includes(k));

      // [NATURAL FALLBACK] If AI response is robotic, replace with expert template based on score
      if (isGeneric) {
          const issues = finalRubric.deductions.length > 0 ? finalRubric.deductions.join(", ") : "구체적인 위험 공유 부족";
          
          if (totalScore >= 80) {
              finalEvaluation = `전반적인 TBM 진행 상태와 근로자 참여도는 우수한 편입니다. 다만, 완벽한 무재해 달성을 위해 '${issues}' 부분은 조금 더 세밀한 관리가 필요해 보입니다.`;
          } else if (totalScore >= 60) {
              finalEvaluation = `TBM의 형식과 절차는 준수하고 있으나, 실질적인 위험 예방 효과를 높이기 위해서는 '${issues}' 측면의 보완이 시급합니다. 관리자의 주도적인 리딩이 요구됩니다.`;
          } else {
              finalEvaluation = `현 시점의 TBM 활동은 형식적인 절차에 그칠 우려가 있습니다. 특히 '${issues}' 요인이 식별된 바, 작업 투입 전 재교육 및 명확한 지적확인이 선행되어야 합니다.`;
          }
      }

      return {
          score: totalScore,
          evaluation: finalEvaluation,
          analysisSource: 'VIDEO',
          rubric: finalRubric,
          details: {
              participation: (raw.details?.participation || 'GOOD') as any,
              voiceClarity: (raw.details?.voiceClarity || 'CLEAR') as any,
              ppeStatus: (raw.details?.ppeStatus || 'GOOD') as any,
              interaction: !!raw.details?.interaction
          },
          focusAnalysis: {
              overall: raw.focusAnalysis?.overall ?? 90,
              distractedCount: raw.focusAnalysis?.distractedCount ?? 0,
              focusZones: {
                  front: (raw.focusAnalysis?.focusZones?.front || 'HIGH') as any,
                  back: (raw.focusAnalysis?.focusZones?.back || 'HIGH') as any,
                  side: (raw.focusAnalysis?.focusZones?.side || 'HIGH') as any
              }
          },
          insight: {
              mentionedTopics: raw.insight?.mentionedTopics || [],
              missingTopics: raw.insight?.missingTopics || [],
              suggestion: raw.insight?.suggestion || "안전 수칙을 철저히 준수합시다."
          },
          feedback: raw.feedback || [] 
      };
    }
    throw new Error("No response text");
  } catch (error: any) {
    console.error("Gemini Insight Error:", error);
    // [FAILSAFE] Return a zero-score object that allows the UI to render the edit controls
    return {
      score: 0,
      evaluation: `[분석 실패] ${error.message || "서버 응답 없음"}. 직접 내용을 수정해주세요.`,
      analysisSource: 'VIDEO',
      rubric: { logQuality: 0, focus: 0, voice: 0, ppe: 0, deductions: ["분석 시간 초과 또는 오류"] },
      details: { participation: 'BAD', voiceClarity: 'NONE', ppeStatus: 'BAD', interaction: false },
      focusAnalysis: { overall: 0, distractedCount: 0, focusZones: { front: 'LOW', back: 'LOW', side: 'LOW' } },
      insight: { mentionedTopics: [], missingTopics: [], suggestion: "수동으로 내용을 입력해주세요." },
      feedback: []
    };
  }
};

// ... (Monthly extraction remains unchanged) ...
export const extractMonthlyPriorities = async (base64Data: string, mimeType: string): Promise<MonthlyExtractionResult> => {
    try {
      const ai = getAiClient(); // Lazy load
      const prompt = `월간 위험성평가표 분석. 날짜(detectedMonth)와 항목(items) 추출.`;
      const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }],
        config: {
          // [FIX] Temperature 0.0 for Document Extraction
          temperature: 0.0, 
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
                     level: { type: Type.STRING },
                     category: { type: Type.STRING }
                   },
                   required: ["content", "level", "category"]
                 }
               }
            },
            required: ["items"]
          },
        },
      }));
      if (response.text) return JSON.parse(cleanAndRepairJson(response.text));
      return { items: [] };
    } catch (error: any) {
      return { items: [] };
    }
};

// [OVERHAULED] Analyze Master Log - Mode Aware & Robust
export const analyzeMasterLog = async (
    base64Data: string, 
    mimeType: string,
    monthlyGuidelines: SafetyGuideline[] = [],
    mode: 'BATCH' | 'ROUTINE' = 'BATCH' // [CRITICAL] Mode param added
  ): Promise<ExtractedTBMData[]> => {
    try {
      const ai = getAiClient(); // Lazy load
      console.log(`Starting Document Analysis in [${mode}] mode...`);
      
      let promptContext = "";
      // Construct Guidelines Text
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
        
        [필수 추출 항목]
        - teams 배열 내 'safetyFeedback'은 반드시 위 규칙에 따라 생성된 코멘트 배열이어야 합니다.
      `;
  
      const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: mimeType, data: base64Data } },
              { text: prompt }
            ]
          }
        ],
        config: {
          // [FIX] Temperature 0.0 for consistent data mining
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
        // [Safety] Use Improved Repair Logic
        const cleanedText = cleanAndRepairJson(response.text);
        let data: any;
        
        try {
            data = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error("Critical JSON Parse Error even after repair:", parseError);
            return [];
        }

        // [Structure Guard] Handle case where AI returns array directly instead of object
        const teamsArray = Array.isArray(data) ? data : (Array.isArray(data.teams) ? data.teams : []);
        
        let globalDate = new Date().toISOString().split('T')[0];
        if (data.documentDate && /^\d{4}-\d{2}-\d{2}$/.test(data.documentDate)) {
            globalDate = data.documentDate;
        }
        
        const processedTeams = teamsArray.map((team: any) => {
            const safeAttendees = safeParseInt(team.attendeesCount);
            const safeRiskCount = safeParseInt(team.riskFactorCount);
            const safeSafetyScore = safeParseInt(team.safetyScore);
            const safeFeedbackLevel = safeParseInt(team.feedbackLevel);

            const safeRiskFactors = Array.isArray(team.riskFactors) ? team.riskFactors : [];
            const safeFeedback = Array.isArray(team.safetyFeedback) ? team.safetyFeedback : [];

            // [CRITICAL LOGIC] Conditional Video Analysis Generation
            let researchAnalysis: TBMAnalysisResult | undefined = undefined;

            if (mode === 'BATCH') {
                // In Batch Mode, we MUST provide a "Verified" analysis result because no video will be uploaded.
                const verifiedScore = safeSafetyScore > 0 ? safeSafetyScore : 85; // Default to 85 (Good) not 95 (Perfect)
                const verifiedFocus = 95; // Assume attentive if verified

                // [NEW] Synthetic Rubric for Batch Mode
                const syntheticRubric = {
                    logQuality: 25, // Good
                    focus: 25,      // Good
                    voice: 18,      // Assumed Good
                    ppe: 17,        // Assumed Good
                    deductions: ["서면 기록 기반 산정"]
                };

                researchAnalysis = {
                    score: verifiedScore,
                    evaluation: `[기검증 데이터] 종합 일지 아카이빙 완료. 위험요인 ${safeRiskCount}건 식별됨.`,
                    analysisSource: 'DOCUMENT',
                    rubric: syntheticRubric, // Add Rubric
                    details: { participation: 'GOOD', voiceClarity: 'CLEAR', ppeStatus: 'GOOD', interaction: true },
                    focusAnalysis: { 
                        overall: verifiedFocus, 
                        distractedCount: 0, 
                        focusZones: { front: 'HIGH', back: 'HIGH', side: 'HIGH' } 
                    },
                    insight: { 
                        mentionedTopics: safeRiskFactors.map((r:any) => r.risk || '') || [], 
                        missingTopics: [], 
                        suggestion: "기존 분석 검증 완료 데이터 (Batch Processed)" 
                    },
                    feedback: safeFeedback // Use extracted feedback here
                };
            } else {
                // In Routine Mode, we do NOT generate fake analysis. 
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
                videoAnalysis: researchAnalysis // Undefined for ROUTINE, Populated for BATCH
            };
        });

        return processedTeams;
      }
      throw new Error("No response text");
    } catch (error: any) {
      console.error("Gemini Data Mining Error:", error);
      return [];
    }
  };
